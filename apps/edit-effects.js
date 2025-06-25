import { MonksLittleDetails, log, setting, i18n } from '../monks-little-details.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class EditEffects extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(object, options) {
        super(object, options);

        this.effects = foundry.utils.duplicate(setting("additional-effects"));
    }

    static DEFAULT_OPTIONS = {
        id: "edit-effects",
        tag: "form",
        classes: ["edit-effects", "monks-little-details"],
        window: {
            contentClasses: ["standard-form"],
            icon: "fa-solid fa-align-justify",
            resizable: false,
            title: "MonksLittleDetails.EditEffects",
        },
        actions: {
            reset: EditEffects.resetEffects,
            addEffect: EditEffects.addEffect,
            deleteEffect: EditEffects.removeEffect,
        },
        form: {
            closeOnSubmit: true,
            handler: EditEffects.onSubmitDocumentForm
        },
        position: {
            width: 800
        }
    };

    static PARTS = {
        main: {
            root: true,
            template: "modules/monks-little-details/templates/edit-effects.html",
            scrollable: [".effects-list"]
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.effects = this.effects;

        return context;
    }

    static async onSubmitDocumentForm(event, form, formData, options = {}) {
        this._update();
        let data = this.effects.filter(c => !!c.id && !!c.name);
        game.settings.set('monks-little-details', 'additional-effects', data);

        for(let effect of data) {
            CONFIG.statusEffects.findSplice(s => s.id === effect.id);
        }

        CONFIG.statusEffects = CONFIG.statusEffects.concat(data);

        this.submitting = true;
    }

    _update() {
        const form = this.form;
        const formData = new foundry.applications.ux.FormDataExtended(form);

        this.effects = Object.values(foundry.utils.expandObject(formData.object)?.effects || {}) || [];
    }

    static resetEffects() {
        this.effects = game.settings.settings.get('monks-little-details.additional-effects').default;
        this.render(true);
    }

    static async addEffect(event) {
        let data = {
            fields: {
                id: new foundry.data.fields.StringField({
                    label: "Effect Id",
                }, { name: "id" }),
                name: new foundry.data.fields.StringField({
                    label: "Name",
                }, { name: "name" }),
                img: new foundry.data.fields.FilePathField({
                    initial: "",
                    categories: ["IMAGE"],
                    label: "Image",
                }, { name: "img" })
            }
        }
        let content = await foundry.applications.handlebars.renderTemplate("modules/monks-little-details/templates/add-effect.hbs", data);
        foundry.applications.api.DialogV2.wait({
            id: "add-effect-dialog",
            window: {
                title: `Add Effect`,
            },
            position: {
                width: 400
            },
            content,
            buttons: [{
                action: "automatic",
                label: "Save",
                icon: "far fa-save",
                callback: async (event, button) => {
                    let form = $(button.form);

                    let id = form.find("input[name='id']").val();
                    let name = form.find("input[name='name']").val();

                    let img = form.find("file-picker[name='img'] > input").val();
                    this._update();
                    this.effects.push({ id, name, img });
                    this.render(true);
                },
                default: true
            }],
        });
    }

    static removeEffect(event) {
        this._update();
        let effectId = event.target.closest('li.effect').dataset.effectId;
        this.effects.findSplice(s => s.id === effectId);
        this.render(true);
    }
}