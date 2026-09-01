function (element, input) {
    "use strict";

    function createResult(success, operation, elementId, message) {
        return JSON.stringify({
            success: success,
            operation: operation || "",
            element_id: elementId || "",
            message: message || ""
        });
    }

    function escapeAttributeValue(value) {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');
    }

    function findInRoot(root, elementId) {
        if (!root || !elementId) {
            return null;
        }

        var selector =
            '[data-rpa-element-id="' +
            escapeAttributeValue(elementId) +
            '"]';

        try {
            var directMatch = root.querySelector(selector);

            if (directMatch) {
                return directMatch;
            }
        } catch (queryError) {
            return null;
        }

        var allElements;

        try {
            allElements = root.querySelectorAll("*");
        } catch (allElementsError) {
            return null;
        }

        for (var i = 0; i < allElements.length; i++) {
            var currentElement = allElements[i];

            if (currentElement.shadowRoot) {
                var shadowMatch = findInRoot(
                    currentElement.shadowRoot,
                    elementId
                );

                if (shadowMatch) {
                    return shadowMatch;
                }
            }

            var tagName = String(
                currentElement.tagName || ""
            ).toUpperCase();

            if (
                tagName === "IFRAME" ||
                tagName === "FRAME"
            ) {
                try {
                    var frameDocument =
                        currentElement.contentDocument ||
                        (
                            currentElement.contentWindow
                                ? currentElement.contentWindow.document
                                : null
                        );

                    var frameMatch = findInRoot(
                        frameDocument,
                        elementId
                    );

                    if (frameMatch) {
                        return frameMatch;
                    }
                } catch (frameAccessError) {
                    // 다른 Origin의 iframe은 브라우저 보안 정책상 접근할 수 없습니다.
                }
            }
        }

        return null;
    }

    function isDisabled(target) {
        if (!target) {
            return true;
        }

        if (target.disabled === true) {
            return true;
        }

        var ariaDisabled = String(
            target.getAttribute("aria-disabled") || ""
        ).toLowerCase();

        return ariaDisabled === "true";
    }

    function dispatchEventSafe(target, eventName) {
        try {
            target.dispatchEvent(
                new Event(eventName, {
                    bubbles: true,
                    cancelable: true
                })
            );
        } catch (eventError) {
            // 이벤트 생성 실패 자체로 액션 전체를 실패시키지는 않습니다.
        }
    }

    function setNativeValue(target, value) {
        var tagName = String(
            target.tagName || ""
        ).toUpperCase();

        if (tagName === "INPUT") {
            var inputDescriptor =
                Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                );

            if (
                inputDescriptor &&
                typeof inputDescriptor.set === "function"
            ) {
                inputDescriptor.set.call(target, value);
            } else {
                target.value = value;
            }

            return;
        }

        if (tagName === "TEXTAREA") {
            var textareaDescriptor =
                Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype,
                    "value"
                );

            if (
                textareaDescriptor &&
                typeof textareaDescriptor.set === "function"
            ) {
                textareaDescriptor.set.call(target, value);
            } else {
                target.value = value;
            }

            return;
        }

        if (target.isContentEditable) {
            target.textContent = value;
            return;
        }

        if ("value" in target) {
            target.value = value;
            return;
        }

        throw new Error(
            "선택된 요소는 값을 입력할 수 있는 요소가 아닙니다."
        );
    }

    try {
        var request;

        try {
            request = JSON.parse(
                String(input || "{}")
            );
        } catch (parseError) {
            return createResult(
                false,
                "",
                "",
                "JS 액션 요청 JSON 파싱에 실패했습니다: " +
                    parseError.message
            );
        }

        var operation = String(
            request.operation || ""
        ).trim().toUpperCase();

        var elementId = String(
            request.element_id || ""
        ).trim();

        var inputValue =
            request.value === null ||
            request.value === undefined
                ? ""
                : String(request.value);

        if (!elementId) {
            return createResult(
                false,
                operation,
                elementId,
                "element_id가 비어 있습니다."
            );
        }

        if (
            operation !== "CLICK" &&
            operation !== "TYPE_INTO"
        ) {
            return createResult(
                false,
                operation,
                elementId,
                "지원하지 않는 operation입니다."
            );
        }

        var target = findInRoot(
            document,
            elementId
        );

        if (!target) {
            return createResult(
                false,
                operation,
                elementId,
                "선택된 element_id에 해당하는 DOM 요소를 찾지 못했습니다."
            );
        }

        if (isDisabled(target)) {
            return createResult(
                false,
                operation,
                elementId,
                "선택된 DOM 요소가 비활성화되어 있습니다."
            );
        }

        try {
            target.scrollIntoView({
                behavior: "auto",
                block: "center",
                inline: "center"
            });
        } catch (scrollError) {
            try {
                target.scrollIntoView();
            } catch (ignoredScrollError) {
                // 스크롤 실패만으로 액션을 중단하지 않습니다.
            }
        }

        if (operation === "CLICK") {
            try {
                target.focus();
            } catch (focusError) {
                // focus 실패만으로 클릭을 중단하지 않습니다.
            }

            if (typeof target.click !== "function") {
                return createResult(
                    false,
                    operation,
                    elementId,
                    "선택된 DOM 요소에 click 함수를 사용할 수 없습니다."
                );
            }

            target.click();

            return createResult(
                true,
                operation,
                elementId,
                "CLICK 액션을 수행했습니다."
            );
        }

        if (operation === "TYPE_INTO") {
            try {
                target.focus();
            } catch (typeFocusError) {
                // 아래 값 설정을 계속 수행합니다.
            }

            setNativeValue(
                target,
                inputValue
            );

            dispatchEventSafe(
                target,
                "input"
            );

            dispatchEventSafe(
                target,
                "change"
            );

            return createResult(
                true,
                operation,
                elementId,
                "TYPE_INTO 액션을 수행했습니다."
            );
        }

        return createResult(
            false,
            operation,
            elementId,
            "실행 가능한 액션 분기를 찾지 못했습니다."
        );
    } catch (error) {
        return createResult(
            false,
            "",
            "",
            error && error.message
                ? error.message
                : String(error)
        );
    }
}