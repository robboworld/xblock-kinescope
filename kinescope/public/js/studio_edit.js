/* Studio editor for KinescopeXBlock (based on StudioEditableXBlockMixin). */
function KinescopeStudioEdit(runtime, element) {
    "use strict";

    var fields = [];
    var tinyMceAvailable = (typeof $.fn.tinymce !== 'undefined');
    var datepickerAvailable = (typeof $.fn.datepicker !== 'undefined');

    function readBooleanValue($field) {
        var val = $field.val();
        return (val === 'true' || val === '1');
    }

    function setBooleanValue($field, value) {
        $field.val(value === true || value === 'true' || value === '1' || value === 1 ? '1' : '0');
    }

    function updateDependentFields() {
        $(element).find('[data-enable-when-field]').each(function() {
            var $dependent = $(this);
            var controllerName = $dependent.data('enable-when-field');
            var $controller = $(element).find('[data-field-name="' + controllerName + '"] .field-data-control').first();
            var enabled = readBooleanValue($controller);
            var $input = $dependent.find('.field-data-control').first();

            $dependent.toggleClass('is-disabled', !enabled);
            $input.prop('disabled', !enabled);
            if (!enabled) {
                $dependent.find('button.setting-clear').prop('disabled', true);
            } else {
                $dependent.find('button.setting-clear').prop('disabled', false);
            }
        });
    }

    $(element).find('.field-data-control').each(function() {
        var $field = $(this);
        var $wrapper = $field.closest('li');
        var $resetButton = $wrapper.find('button.setting-clear');
        var type = $wrapper.data('cast');
        fields.push({
            name: $wrapper.data('field-name'),
            isSet: function() { return $wrapper.hasClass('is-set'); },
            hasEditor: function() { return tinyMceAvailable && $field.tinymce(); },
            val: function() {
                var val;
                if (type === 'boolean') {
                    return readBooleanValue($field);
                }
                val = $field.val();
                if (type === "integer") {
                    return parseInt(val, 10);
                }
                if (type === "float") {
                    return parseFloat(val);
                }
                if (type === "generic" || type === "list" || type === "set") {
                    val = val.trim();
                    if (val === "") {
                        val = null;
                    } else {
                        val = JSON.parse(val);
                    }
                }
                return val;
            },
            removeEditor: function() {
                $field.tinymce().remove();
            }
        });
        var fieldChanged = function() {
            $wrapper.addClass('is-set');
            $resetButton.removeClass('inactive').addClass('active');
            if ($wrapper.data('field-name') === 'show_header_text') {
                updateDependentFields();
            }
        };
        $field.bind("change input paste click", fieldChanged);
        $resetButton.click(function() {
            if (type === 'boolean') {
                setBooleanValue($field, $wrapper.attr('data-default'));
            } else {
                $field.val($wrapper.attr('data-default'));
            }
            $wrapper.removeClass('is-set');
            $resetButton.removeClass('active').addClass('inactive');
            updateDependentFields();
        });
        if (type === 'html' && tinyMceAvailable) {
            tinyMCE.baseURL = baseUrl + "/js/vendor/tinymce/js/tinymce";
            $field.tinymce({
                theme: 'silver',
                skin: 'studio-tmce5',
                content_css: 'studio-tmce5',
                height: '200px',
                formats: { code: { inline: 'code' } },
                codemirror: { path: "" + baseUrl + "/js/vendor" },
                convert_urls: false,
                plugins: "lists, link, codemirror",
                menubar: false,
                statusbar: false,
                toolbar_items_size: 'small',
                toolbar: "formatselect | styleselect | bold italic underline forecolor | bullist numlist outdent indent blockquote | link unlink | code",
                resize: "both",
                extended_valid_elements : 'i[class],span[class]',
                setup : function(ed) {
                    ed.on('change', fieldChanged);
                }
            });
        }

        if (type === 'datepicker' && datepickerAvailable) {
            $field.datepicker('destroy');
            $field.datepicker({dateFormat: "m/d/yy"});
        }
    });

    $(element).find('.wrapper-list-settings .list-set').each(function() {
        var $optionList = $(this);
        var $checkboxes = $(this).find('input');
        var $wrapper = $optionList.closest('li');
        var $resetButton = $wrapper.find('button.setting-clear');

        fields.push({
            name: $wrapper.data('field-name'),
            isSet: function() { return $wrapper.hasClass('is-set'); },
            hasEditor: function() { return false; },
            val: function() {
                var val = [];
                $checkboxes.each(function() {
                    if ($(this).is(':checked')) {
                        val.push(JSON.parse($(this).val()));
                    }
                });
                return val;
            }
        });
        var fieldChanged = function() {
            $wrapper.addClass('is-set');
            $resetButton.removeClass('inactive').addClass('active');
        };
        $checkboxes.bind("change input", fieldChanged);

        $resetButton.click(function() {
            var defaults = JSON.parse($wrapper.attr('data-default'));
            $checkboxes.each(function() {
                var val = JSON.parse($(this).val());
                $(this).prop('checked', defaults.indexOf(val) > -1);
            });
            $wrapper.removeClass('is-set');
            $resetButton.removeClass('active').addClass('inactive');
        });
    });

    updateDependentFields();

    var studio_submit = function(data) {
        var handlerUrl = runtime.handlerUrl(element, 'submit_studio_edits');
        runtime.notify('save', {state: 'start', message: gettext("Saving")});
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify(data),
            dataType: "json",
            global: false,
            success: function(response) { runtime.notify('save', {state: 'end'}); }
        }).fail(function(jqXHR) {
            var message = gettext("This may be happening because of an error with our server or your internet connection. Try refreshing the page or making sure you are online.");
            if (jqXHR.responseText) {
                try {
                    message = JSON.parse(jqXHR.responseText).error;
                    if (typeof message === "object" && message.messages) {
                        message = $.map(message.messages, function(msg) { return msg.text; }).join(", ");
                    }
                } catch (error) { message = jqXHR.responseText.substr(0, 300); }
            }
            runtime.notify('error', {title: gettext("Unable to update settings"), message: message});
        });
    };

    $('.save-button', element).bind('click', function(e) {
        e.preventDefault();
        var values = {};
        var notSet = [];
        for (var i in fields) {
            var field = fields[i];
            if (field.isSet()) {
                values[field.name] = field.val();
            } else {
                notSet.push(field.name);
            }
            if (field.hasEditor()) {
                field.removeEditor();
            }
        }
        studio_submit({values: values, defaults: notSet});
    });

    $(element).find('.cancel-button').bind('click', function(e) {
        for (var i in fields) {
            var field = fields[i];
            if (field.hasEditor()) {
                field.removeEditor();
            }
        }
        e.preventDefault();
        runtime.notify('cancel', {});
    });
}
