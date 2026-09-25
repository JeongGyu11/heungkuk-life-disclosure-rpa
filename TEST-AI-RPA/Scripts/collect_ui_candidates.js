function (element, input) {
    "use strict";

    var ELEMENT_ID_ATTRIBUTE = "data-rpa-element-id";
    var MAX_TEXT_LENGTH = 200;
    var MAX_HINT_LENGTH = 200;
    var MAX_CONTEXT_LENGTH = 200;

    function normalizeString(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/\s+/g, " ")
            .trim();
    }

    function truncate(value, maxLength) {
        var normalizedValue = normalizeString(value);

        if (normalizedValue.length <= maxLength) {
            return normalizedValue;
        }

        return normalizedValue.substring(0, maxLength);
    }

    function getAttributeSafe(target, attributeName) {
        try {
            if (
                !target ||
                typeof target.getAttribute !== "function"
            ) {
                return "";
            }

            return normalizeString(
                target.getAttribute(attributeName)
            );
        } catch (error) {
            return "";
        }
    }

    function hasAttributeSafe(target, attributeName) {
        try {
            return Boolean(
                target &&
                typeof target.hasAttribute === "function" &&
                target.hasAttribute(attributeName)
            );
        } catch (error) {
            return false;
        }
    }

    function getTagName(target) {
        try {
            return normalizeString(
                target.tagName || target.nodeName
            ).toUpperCase();
        } catch (error) {
            return "";
        }
    }

    function getRole(target) {
        return getAttributeSafe(
            target,
            "role"
        ).toLowerCase();
    }

    function getInputType(target) {
        if (getTagName(target) !== "INPUT") {
            return "";
        }

        return (
            getAttributeSafe(target, "type") ||
            "text"
        ).toLowerCase();
    }

    function getVisibleText(target) {
        if (!target) {
            return "";
        }

        try {
            var textValue = "";

            if (
                typeof target.innerText === "string" &&
                target.innerText
            ) {
                textValue = target.innerText;
            } else if (
                typeof target.textContent === "string"
            ) {
                textValue = target.textContent;
            }

            return truncate(
                textValue,
                MAX_TEXT_LENGTH
            );
        } catch (error) {
            return "";
        }
    }

    function getAssociatedLabelText(target) {
        if (!target) {
            return "";
        }

        try {
            if (
                target.labels &&
                target.labels.length > 0
            ) {
                var labelTexts = [];

                for (
                    var labelIndex = 0;
                    labelIndex < target.labels.length;
                    labelIndex++
                ) {
                    var labelText = getVisibleText(
                        target.labels[labelIndex]
                    );

                    if (labelText) {
                        labelTexts.push(labelText);
                    }
                }

                if (labelTexts.length > 0) {
                    return truncate(
                        labelTexts.join(" "),
                        MAX_HINT_LENGTH
                    );
                }
            }
        } catch (labelsError) {
            // 다른 방식으로 label을 확인합니다.
        }

        var targetId = getAttributeSafe(
            target,
            "id"
        );

        if (!targetId) {
            return "";
        }

        try {
            var ownerDocument =
                target.ownerDocument || document;

            var labels =
                ownerDocument.querySelectorAll(
                    "label"
                );

            for (
                var index = 0;
                index < labels.length;
                index++
            ) {
                if (
                    getAttributeSafe(
                        labels[index],
                        "for"
                    ) === targetId
                ) {
                    return truncate(
                        getVisibleText(labels[index]),
                        MAX_HINT_LENGTH
                    );
                }
            }
        } catch (labelSearchError) {
            return "";
        }

        return "";
    }

    function getAccessibleName(target) {
        if (!target) {
            return "";
        }

        var ariaLabel = getAttributeSafe(
            target,
            "aria-label"
        );

        if (ariaLabel) {
            return truncate(
                ariaLabel,
                MAX_HINT_LENGTH
            );
        }

        var ariaLabelledBy = getAttributeSafe(
            target,
            "aria-labelledby"
        );

        if (ariaLabelledBy) {
            try {
                var ownerDocument =
                    target.ownerDocument || document;

                var labelIds =
                    ariaLabelledBy.split(/\s+/);

                var labelledTexts = [];

                for (
                    var labelIndex = 0;
                    labelIndex < labelIds.length;
                    labelIndex++
                ) {
                    var labelledElement =
                        ownerDocument.getElementById(
                            labelIds[labelIndex]
                        );

                    if (labelledElement) {
                        var labelledText =
                            getVisibleText(
                                labelledElement
                            );

                        if (labelledText) {
                            labelledTexts.push(
                                labelledText
                            );
                        }
                    }
                }

                if (labelledTexts.length > 0) {
                    return truncate(
                        labelledTexts.join(" "),
                        MAX_HINT_LENGTH
                    );
                }
            } catch (labelledByError) {
                // 다른 이름 후보를 계속 확인합니다.
            }
        }

        var associatedLabelText =
            getAssociatedLabelText(target);

        if (associatedLabelText) {
            return associatedLabelText;
        }

        var title = getAttributeSafe(
            target,
            "title"
        );

        if (title) {
            return truncate(
                title,
                MAX_HINT_LENGTH
            );
        }

        var placeholder = getAttributeSafe(
            target,
            "placeholder"
        );

        if (placeholder) {
            return truncate(
                placeholder,
                MAX_HINT_LENGTH
            );
        }

        var alt = getAttributeSafe(
            target,
            "alt"
        );

        if (alt) {
            return truncate(
                alt,
                MAX_HINT_LENGTH
            );
        }

        var value = getAttributeSafe(
            target,
            "value"
        );

        if (
            value &&
            (
                getTagName(target) === "BUTTON" ||
                getInputType(target) === "button" ||
                getInputType(target) === "submit" ||
                getInputType(target) === "reset"
            )
        ) {
            return truncate(
                value,
                MAX_HINT_LENGTH
            );
        }

        return getVisibleText(target);
    }

    function isVisible(target) {
        if (!target) {
            return false;
        }

        try {
            if (
                getTagName(target) === "INPUT" &&
                getInputType(target) === "hidden"
            ) {
                return false;
            }

            if (
                hasAttributeSafe(target, "hidden")
            ) {
                return false;
            }

            var ariaHidden = getAttributeSafe(
                target,
                "aria-hidden"
            ).toLowerCase();

            if (ariaHidden === "true") {
                return false;
            }

            var ownerWindow =
                target.ownerDocument &&
                target.ownerDocument.defaultView
                    ? target.ownerDocument.defaultView
                    : window;

            var computedStyle =
                ownerWindow.getComputedStyle(target);

            if (!computedStyle) {
                return false;
            }

            if (
                computedStyle.display === "none" ||
                computedStyle.visibility === "hidden" ||
                computedStyle.visibility === "collapse"
            ) {
                return false;
            }

            var opacityValue = Number(
                computedStyle.opacity
            );

            if (
                !isNaN(opacityValue) &&
                opacityValue === 0
            ) {
                return false;
            }

            if (
                typeof target.getClientRects !== "function"
            ) {
                return false;
            }

            var clientRects =
                target.getClientRects();

            if (
                !clientRects ||
                clientRects.length === 0
            ) {
                return false;
            }

            if (
                typeof target.getBoundingClientRect ===
                "function"
            ) {
                var boundingRectangle =
                    target.getBoundingClientRect();

                if (
                    boundingRectangle.width <= 1 &&
                    boundingRectangle.height <= 1
                ) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    function isEnabled(target) {
        if (!target) {
            return false;
        }

        try {
            if (target.disabled === true) {
                return false;
            }

            if (
                typeof target.matches === "function" &&
                target.matches(":disabled")
            ) {
                return false;
            }

            if (
                hasAttributeSafe(target, "disabled")
            ) {
                return false;
            }

            var ariaDisabled = getAttributeSafe(
                target,
                "aria-disabled"
            ).toLowerCase();

            if (ariaDisabled === "true") {
                return false;
            }

            if (
                hasAttributeSafe(target, "inert")
            ) {
                return false;
            }

            if (
                typeof target.closest === "function"
            ) {
                var inertParent =
                    target.closest("[inert]");

                if (inertParent) {
                    return false;
                }

                var ariaDisabledParent =
                    target.closest(
                        '[aria-disabled="true"]'
                    );

                if (
                    ariaDisabledParent &&
                    ariaDisabledParent !== target
                ) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return true;
        }
    }

    function isReadOnly(target) {
        if (!target) {
            return false;
        }

        try {
            if (target.readOnly === true) {
                return true;
            }

            if (
                hasAttributeSafe(
                    target,
                    "readonly"
                )
            ) {
                return true;
            }
        } catch (readOnlyError) {
            // aria-readonly 검사를 계속합니다.
        }

        return (
            getAttributeSafe(
                target,
                "aria-readonly"
            ).toLowerCase() === "true"
        );
    }

    function isInputCandidate(target) {
        if (!target) {
            return false;
        }

        var tagName = getTagName(target);
        var role = getRole(target);
        var inputType = getInputType(target);

        if (tagName === "TEXTAREA") {
            return true;
        }

        if (tagName === "INPUT") {
            var excludedInputTypes = {
                hidden: true,
                button: true,
                submit: true,
                reset: true,
                checkbox: true,
                radio: true,
                file: true,
                image: true,
                range: true,
                color: true
            };

            return !excludedInputTypes[inputType];
        }

        try {
            if (target.isContentEditable === true) {
                return true;
            }
        } catch (contentEditableError) {
            // role 검사를 계속합니다.
        }

        if (
            role === "textbox" ||
            role === "searchbox" ||
            role === "spinbutton"
        ) {
            return true;
        }

        return hasAttributeSafe(
            target,
            "contenteditable"
        );
    }

    function isEditable(target) {
        return (
            isInputCandidate(target) &&
            isEnabled(target) &&
            !isReadOnly(target)
        );
    }

    function isClickable(target) {
        if (!target) {
            return false;
        }

        var tagName = getTagName(target);
        var role = getRole(target);
        var inputType = getInputType(target);

        /*
         * 클릭 용도의 요소인지 판단합니다.
         * 현재 활성화 상태인지 여부는 여기서 판단하지 않습니다.
         * 따라서 disabled 버튼도 true가 반환됩니다.
         */

        if (
            tagName === "BUTTON" ||
            tagName === "SUMMARY" ||
            tagName === "SELECT" ||
            tagName === "OPTION"
        ) {
            return true;
        }

        if (tagName === "A") {
            if (
                getAttributeSafe(target, "href") ||
                role === "button" ||
                getAttributeSafe(target, "onclick")
            ) {
                return true;
            }
        }

        if (tagName === "INPUT") {
            var clickableInputTypes = {
                button: true,
                submit: true,
                reset: true,
                checkbox: true,
                radio: true,
                file: true,
                image: true,
                range: true,
                color: true,
                date: true,
                time: true,
                month: true,
                week: true
            };

            if (clickableInputTypes[inputType]) {
                return true;
            }
        }

        var clickableRoles = {
            button: true,
            link: true,
            menuitem: true,
            menuitemcheckbox: true,
            menuitemradio: true,
            tab: true,
            checkbox: true,
            radio: true,
            switch: true,
            option: true,
            combobox: true,
            treeitem: true,
            gridcell: true
        };

        if (clickableRoles[role]) {
            return true;
        }

        if (
            getAttributeSafe(
                target,
                "onclick"
            )
        ) {
            return true;
        }

        var tabIndex = getAttributeSafe(
            target,
            "tabindex"
        );

        if (
            tabIndex !== "" &&
            !isNaN(Number(tabIndex)) &&
            Number(tabIndex) >= 0
        ) {
            return true;
        }

        try {
            var ownerWindow =
                target.ownerDocument &&
                target.ownerDocument.defaultView
                    ? target.ownerDocument.defaultView
                    : window;

            var computedStyle =
                ownerWindow.getComputedStyle(target);

            if (
                computedStyle &&
                computedStyle.cursor === "pointer"
            ) {
                return true;
            }
        } catch (styleError) {
            // false 반환을 계속 진행합니다.
        }

        return false;
    }

    function isActionable(target, operation) {
        if (!target) {
            return false;
        }

        if (!isVisible(target)) {
            return false;
        }

        if (!isEnabled(target)) {
            return false;
        }

        if (operation === "CLICK") {
            return isClickable(target);
        }

        if (operation === "TYPE_INTO") {
            return isEditable(target);
        }

        return false;
    }

    function findInteractiveParent(
        target,
        operation
    ) {
        var currentElement = target;
        var visitedElements = [];

        while (currentElement) {
            if (
                visitedElements.indexOf(
                    currentElement
                ) >= 0
            ) {
                break;
            }

            visitedElements.push(
                currentElement
            );

            if (
                operation === "CLICK" &&
                isClickable(currentElement)
            ) {
                return currentElement;
            }

            if (
                operation === "TYPE_INTO" &&
                isInputCandidate(currentElement)
            ) {
                return currentElement;
            }

            if (currentElement.parentElement) {
                currentElement =
                    currentElement.parentElement;

                continue;
            }

            try {
                var currentRoot =
                    currentElement.getRootNode();

                if (
                    currentRoot &&
                    currentRoot.host
                ) {
                    currentElement =
                        currentRoot.host;

                    continue;
                }
            } catch (rootError) {
                // 탐색을 종료합니다.
            }

            currentElement = null;
        }

        return null;
    }

    function getControlType(target) {
        var tagName = getTagName(target);
        var role = getRole(target);
        var inputType = getInputType(target);

        if (
            tagName === "BUTTON" ||
            role === "button"
        ) {
            return "Button";
        }

        if (
            tagName === "A" ||
            role === "link"
        ) {
            return "Link";
        }

        if (
            inputType === "checkbox" ||
            role === "checkbox"
        ) {
            return "CheckBox";
        }

        if (
            inputType === "radio" ||
            role === "radio"
        ) {
            return "RadioButton";
        }

        if (
            tagName === "SELECT" ||
            role === "combobox"
        ) {
            return "ComboBox";
        }

        if (
            role === "tab"
        ) {
            return "Tab";
        }

        if (
            role === "menuitem"
        ) {
            return "MenuItem";
        }

        if (
            role === "option"
        ) {
            return "Option";
        }

        if (isInputCandidate(target)) {
            return "Edit";
        }

        return tagName || "Element";
    }

    function getClassHint(target) {
        return truncate(
            getAttributeSafe(
                target,
                "class"
            ),
            MAX_HINT_LENGTH
        );
    }

    function getHrefHint(target) {
        var rawHref = getAttributeSafe(
            target,
            "href"
        );

        if (!rawHref) {
            return "";
        }

        if (
            rawHref.toLowerCase().indexOf(
                "javascript:"
            ) === 0
        ) {
            return "";
        }

        try {
            var ownerDocument =
                target.ownerDocument || document;

            var parsedUrl = new URL(
                rawHref,
                ownerDocument.baseURI
            );

            if (
                parsedUrl.origin ===
                ownerDocument.location.origin
            ) {
                return truncate(
                    parsedUrl.pathname,
                    MAX_HINT_LENGTH
                );
            }

            return truncate(
                parsedUrl.origin +
                    parsedUrl.pathname,
                MAX_HINT_LENGTH
            );
        } catch (error) {
            return truncate(
                rawHref
                    .split("?")[0]
                    .split("#")[0],
                MAX_HINT_LENGTH
            );
        }
    }

    function getParentText(target) {
        try {
            if (
                !target ||
                !target.parentElement
            ) {
                return "";
            }

            return truncate(
                getVisibleText(
                    target.parentElement
                ),
                MAX_CONTEXT_LENGTH
            );
        } catch (error) {
            return "";
        }
    }

    function getNearbyText(target) {
        if (!target) {
            return "";
        }

        try {
            var nearbyParts = [];

            var associatedLabelText =
                getAssociatedLabelText(target);

            if (associatedLabelText) {
                nearbyParts.push(
                    associatedLabelText
                );
            }

            if (
                target.previousElementSibling
            ) {
                var previousText =
                    getVisibleText(
                        target.previousElementSibling
                    );

                if (previousText) {
                    nearbyParts.push(
                        previousText
                    );
                }
            }

            if (
                target.nextElementSibling
            ) {
                var nextText =
                    getVisibleText(
                        target.nextElementSibling
                    );

                if (nextText) {
                    nearbyParts.push(
                        nextText
                    );
                }
            }

            return truncate(
                nearbyParts.join(" | "),
                MAX_CONTEXT_LENGTH
            );
        } catch (error) {
            return "";
        }
    }

    function getRootDescription(target) {
        if (!target) {
            return "unknown";
        }

        var tagName = getTagName(target);
        var idValue = getAttributeSafe(
            target,
            "id"
        );

        var nameValue = getAttributeSafe(
            target,
            "name"
        );

        var titleValue = getAttributeSafe(
            target,
            "title"
        );

        var description =
            tagName || "element";

        if (idValue) {
            description += "#" + idValue;
        } else if (nameValue) {
            description +=
                '[name="' +
                nameValue +
                '"]';
        } else if (titleValue) {
            description +=
                '[title="' +
                truncate(titleValue, 50) +
                '"]';
        }

        return description;
    }

    function parseOperation(rawInput) {
        var normalizedInput =
            normalizeString(rawInput);

        if (!normalizedInput) {
            return "";
        }

        if (
            normalizedInput.charAt(0) === "{"
        ) {
            try {
                var parsedInput =
                    JSON.parse(
                        normalizedInput
                    );

                return normalizeString(
                    parsedInput.operation
                ).toUpperCase();
            } catch (parseError) {
                // 일반 문자열 입력으로 처리합니다.
            }
        }

        return normalizedInput.toUpperCase();
    }

    function createErrorResult(
        operation,
        message
    ) {
        return JSON.stringify({
            success: false,
            source: "JS",
            target_type: "WEB",
            operation: operation || "",
            candidate_count: 0,
            candidates: [],
            error_message: message || ""
        });
    }

    function getRootDocument(targetElement) {
        try {
            if (
                targetElement &&
                targetElement.nodeType === 9
            ) {
                return targetElement;
            }

            if (
                targetElement &&
                targetElement.ownerDocument
            ) {
                return targetElement.ownerDocument;
            }
        } catch (error) {
            // 기본 document를 반환합니다.
        }

        return document;
    }

    function clearTemporaryIds(
        root,
        visitedRoots
    ) {
        if (
            !root ||
            typeof root.querySelectorAll !==
                "function"
        ) {
            return;
        }

        if (
            visitedRoots.indexOf(root) >= 0
        ) {
            return;
        }

        visitedRoots.push(root);

        var rootElements;

        try {
            rootElements =
                root.querySelectorAll("*");
        } catch (queryError) {
            return;
        }

        for (
            var index = 0;
            index < rootElements.length;
            index++
        ) {
            var currentElement =
                rootElements[index];

            try {
                currentElement.removeAttribute(
                    ELEMENT_ID_ATTRIBUTE
                );
            } catch (removeError) {
                // 기존 임시 ID 제거 실패는 무시합니다.
            }

            try {
                if (currentElement.shadowRoot) {
                    clearTemporaryIds(
                        currentElement.shadowRoot,
                        visitedRoots
                    );
                }
            } catch (shadowError) {
                // closed Shadow DOM은 접근할 수 없습니다.
            }

            var tagName =
                getTagName(currentElement);

            if (
                tagName === "IFRAME" ||
                tagName === "FRAME"
            ) {
                try {
                    var frameDocument =
                        currentElement.contentDocument ||
                        (
                            currentElement.contentWindow
                                ? currentElement
                                    .contentWindow
                                    .document
                                : null
                        );

                    if (frameDocument) {
                        clearTemporaryIds(
                            frameDocument,
                            visitedRoots
                        );
                    }
                } catch (frameError) {
                    // Cross-Origin iframe은 접근할 수 없습니다.
                }
            }
        }
    }

    try {
        var operation =
            parseOperation(input);

        if (
            operation !== "CLICK" &&
            operation !== "TYPE_INTO"
        ) {
            return createErrorResult(
                operation,
                "지원하지 않는 operation입니다: " +
                    (
                        operation ||
                        "(empty)"
                    )
            );
        }

        var rootDocument =
            getRootDocument(element);

        /*
         * 이전 후보 수집 시 부여했던 임시 ID를 제거합니다.
         * 새로운 화면 상태를 기준으로 E001부터 다시 부여합니다.
         */
        clearTemporaryIds(
            rootDocument,
            []
        );

        var collectedCandidates = [];
        var seenElements = [];
        var visitedRoots = [];

        function addCandidate(
            candidateElement,
            framePath
        ) {
            if (!candidateElement) {
                return;
            }

            if (
                seenElements.indexOf(
                    candidateElement
                ) >= 0
            ) {
                return;
            }

            /*
             * 사람이 화면에서 볼 수 없는 요소는 제외합니다.
             * 화면 밖으로 스크롤해야 보이는 요소는 렌더링된 요소이므로
             * 제외하지 않습니다.
             */
            if (!isVisible(candidateElement)) {
                return;
            }

            /*
             * CLICK 후보:
             * 클릭 용도의 컨트롤인지 확인합니다.
             * 활성화 여부는 제외 조건으로 사용하지 않습니다.
             */
            if (
                operation === "CLICK" &&
                !isClickable(candidateElement)
            ) {
                return;
            }

            /*
             * TYPE_INTO 후보:
             * 입력 용도의 컨트롤인지 확인합니다.
             * disabled와 readonly 여부는 제외 조건으로 사용하지 않습니다.
             */
            if (
                operation === "TYPE_INTO" &&
                !isInputCandidate(
                    candidateElement
                )
            ) {
                return;
            }

            seenElements.push(
                candidateElement
            );

            collectedCandidates.push({
                element: candidateElement,
                framePath:
                    framePath || "top"
            });
        }

        function collectFromRoot(
            root,
            framePath
        ) {
            if (
                !root ||
                typeof root.querySelectorAll !==
                    "function"
            ) {
                return;
            }

            if (
                visitedRoots.indexOf(root) >= 0
            ) {
                return;
            }

            visitedRoots.push(root);

            var allElements;

            try {
                allElements =
                    root.querySelectorAll("*");
            } catch (queryError) {
                return;
            }

            for (
                var index = 0;
                index < allElements.length;
                index++
            ) {
                var currentElement =
                    allElements[index];

                if (!isVisible(currentElement)) {
                    continue;
                }

                var operationTarget =
                    findInteractiveParent(
                        currentElement,
                        operation
                    );

                if (operationTarget) {
                    addCandidate(
                        operationTarget,
                        framePath
                    );
                }

                try {
                    if (
                        currentElement.shadowRoot
                    ) {
                        collectFromRoot(
                            currentElement.shadowRoot,
                            framePath +
                                " > shadow(" +
                                getRootDescription(
                                    currentElement
                                ) +
                                ")"
                        );
                    }
                } catch (shadowError) {
                    // closed Shadow DOM은 접근할 수 없습니다.
                }

                var tagName =
                    getTagName(currentElement);

                if (
                    tagName === "IFRAME" ||
                    tagName === "FRAME"
                ) {
                    try {
                        var frameDocument =
                            currentElement
                                .contentDocument ||
                            (
                                currentElement
                                    .contentWindow
                                    ? currentElement
                                        .contentWindow
                                        .document
                                    : null
                            );

                        if (frameDocument) {
                            collectFromRoot(
                                frameDocument,
                                framePath +
                                    " > frame(" +
                                    getRootDescription(
                                        currentElement
                                    ) +
                                    ")"
                            );
                        }
                    } catch (frameError) {
                        /*
                         * Cross-Origin iframe은 브라우저 보안 정책상
                         * JavaScript로 내부 요소를 확인할 수 없습니다.
                         */
                    }
                }
            }
        }

        collectFromRoot(
            rootDocument,
            "top"
        );

        var candidates = [];
        var assignedCandidateCount = 0;

        for (
            var candidateIndex = 0;
            candidateIndex <
                collectedCandidates.length;
            candidateIndex++
        ) {
            var candidateEntry =
                collectedCandidates[
                    candidateIndex
                ];

            var candidateTarget =
                candidateEntry.element;

            var nextCandidateNumber =
                assignedCandidateCount + 1;

            var numberText =
                String(nextCandidateNumber);

            while (numberText.length < 3) {
                numberText =
                    "0" + numberText;
            }

            var elementId =
                "E" + numberText;

            try {
                candidateTarget.setAttribute(
                    ELEMENT_ID_ATTRIBUTE,
                    elementId
                );
            } catch (setAttributeError) {
                /*
                 * DOM 속성을 설정하지 못한 요소는
                 * 이후 UiPath가 element_id로 다시 찾을 수 없으므로
                 * 후보에 포함하지 않습니다.
                 */
                continue;
            }

            assignedCandidateCount++;

            var candidateObject = {
                element_id: elementId,
                source: "JS",
                target_type: "WEB",

                control_type:
                    getControlType(
                        candidateTarget
                    ),

                tag:
                    getTagName(
                        candidateTarget
                    ),

                role:
                    getRole(
                        candidateTarget
                    ),

                text:
                    getVisibleText(
                        candidateTarget
                    ),

                aaname:
                    getAccessibleName(
                        candidateTarget
                    ),

                aria_label:
                    truncate(
                        getAttributeSafe(
                            candidateTarget,
                            "aria-label"
                        ),
                        MAX_HINT_LENGTH
                    ),

                title:
                    truncate(
                        getAttributeSafe(
                            candidateTarget,
                            "title"
                        ),
                        MAX_HINT_LENGTH
                    ),

                placeholder:
                    truncate(
                        getAttributeSafe(
                            candidateTarget,
                            "placeholder"
                        ),
                        MAX_HINT_LENGTH
                    ),

                input_type:
                    getInputType(
                        candidateTarget
                    ),

                name_hint:
                    truncate(
                        getAttributeSafe(
                            candidateTarget,
                            "name"
                        ),
                        MAX_HINT_LENGTH
                    ),

                id_hint:
                    truncate(
                        getAttributeSafe(
                            candidateTarget,
                            "id"
                        ),
                        MAX_HINT_LENGTH
                    ),

                class_hint:
                    getClassHint(
                        candidateTarget
                    ),

                href_hint:
                    getHrefHint(
                        candidateTarget
                    ),

                parent_text:
                    getParentText(
                        candidateTarget
                    ),

                nearby_text:
                    getNearbyText(
                        candidateTarget
                    ),

                frame_path:
                    candidateEntry.framePath,

                interactive_parent_element_id:
                    "",

                is_visible:
                    isVisible(
                        candidateTarget
                    ),

                is_enabled:
                    isEnabled(
                        candidateTarget
                    ),

                is_clickable:
                    isClickable(
                        candidateTarget
                    ),

                is_input_candidate:
                    isInputCandidate(
                        candidateTarget
                    ),

                is_editable:
                    isEditable(
                        candidateTarget
                    ),

                is_readonly:
                    isReadOnly(
                        candidateTarget
                    ),

                is_actionable:
                    isActionable(
                        candidateTarget,
                        operation
                    )
            };

            candidates.push(
                candidateObject
            );
        }

        return JSON.stringify({
            success:
                candidates.length > 0,

            source:
                "JS",

            target_type:
                "WEB",

            operation:
                operation,

            candidate_count:
                candidates.length,

            candidates:
                candidates,

            error_message:
                candidates.length > 0
                    ? ""
                    : (
                        operation === "CLICK"
                            ? "현재 화면에서 보이는 클릭 용도 요소를 찾지 못했습니다."
                            : "현재 화면에서 보이는 입력 용도 요소를 찾지 못했습니다."
                    )
        });
    } catch (error) {
        return createErrorResult(
            "",
            error && error.message
                ? error.message
                : String(error)
        );
    }
}