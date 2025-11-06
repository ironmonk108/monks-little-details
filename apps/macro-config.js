import { MonksLittleDetails, log, error, setting, i18n } from '../monks-little-details.js';

export const WithMLDMacroConfig = (MacroConfig) => {
    class MLDMacroConfig extends MacroConfig {
        static DEFAULT_OPTIONS = {
            actions: {
                apply: MLDMacroConfig.onApply
            }
        }

        persistPosition = foundry.utils.debounce(this.onPersistPosition.bind(this), 1000);

        setPosition(position) {
            position = super.setPosition(position);
            this.persistPosition(position);
            return position;
        }

        onPersistPosition(position) {
            let macroWindowSize = foundry.utils.duplicate(game.user.getFlag("monks-little-details", "macro-window-size") || {});
            macroWindowSize[this.options.document.id] = { width: this.position.width, height: this.position.height };
            game.user.setFlag("monks-little-details", "macro-window-size", macroWindowSize);
        }

        _initializeApplicationOptions(options) {
            let applicationOptions = super._initializeApplicationOptions(options);
            let macroWindowSize = game.user.getFlag("monks-little-details", "macro-window-size") || {};
            if (macroWindowSize[options.document.id]) {
                let pos = macroWindowSize[options.document.id];
                applicationOptions.position.width = pos.width || applicationOptions.position.width;
                applicationOptions.position.height = pos.height || applicationOptions.position.height;
            }
            return applicationOptions;
        }

        async _onRender(context, options) {
            await super._onRender(context, options);
            $('.form-footer', this.element).prepend(
                $("<button>")
                    .attr("type", "button")
                    .attr("data-action", "apply")
                    .html('<i class="fas fa-file-download"></i> Apply'));
        }

        static onApply(event, target) {
            //event.currentTarget = event.currentTarget.closest('form');
            this._onSubmitForm.call(this, {
                closeOnSubmit: false,
                handler: async function (event, form, formData, options = {}) {
                    if (!this.isEditable) return;
                    const { updateData, ...updateOptions } = options;
                    const submitData = this._prepareSubmitData(event, form, formData, updateData);
                    await this._processSubmitData(event, form, submitData, updateOptions);
                    ui.notifications.info("Macro saved");
                }
            }, event)
        }
    }

    const constructorName = "MLDMacroConfig";
    Object.defineProperty(MLDMacroConfig.prototype.constructor, "name", { value: constructorName });
    return MLDMacroConfig;
};