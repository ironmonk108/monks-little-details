import { MonksLittleDetails, i18n, log, setting, patchFunc } from "../monks-little-details.js";

export class HUDChanges {
    static init() {
        if (game.settings.get("monks-little-details", "alter-hud")) {
            patchFunc("TokenHUD.prototype._render", function (wrapped, ...args) {
                let result = wrapped(...args).then((a, b) => {
                    HUDChanges.alterHUD.call(this, this.element);
                    CONFIG.statusEffects = CONFIG.statusEffects.filter(e => e.id != "");
                });

                return result;
            });

            patchFunc("TokenHUD.prototype._getStatusEffectChoices", function (wrapped, ...args) {
                if (setting('sort-statuses') != 'none') {
                    CONFIG.statusEffects = CONFIG.statusEffects.sort(function (a, b) {
                        let aName = a.name;
                        let bName = b.name;
                        if (!aName) aName = i18n(a.label);
                        if (!bName) bName = i18n(b.label);
                        let aid = aName || a.id || a;
                        let bid = bName || b.id || b;
                        return (aid > bid ? 1 : (aid < bid ? -1 : 0));
                        //return (a.id == undefined || a.id > b.id ? 1 : (a.id < b.id ? -1 : 0)); //(a.label == undefined || i18n(a.label) > i18n(b.label) ? 1 : (i18n(a.label) < i18n(b.label) ? -1 : 0));
                    });
                }

                return wrapped(...args);
            });
        }
    }

    static ready() {
        if (setting('sort-by-columns'))
            game.settings.settings.get("monks-little-details.sort-statuses").default = 'columns';
    }

    static async alterHUD(html) {
        if (MonksLittleDetails.canDo("alter-hud") && setting("alter-hud")) {
            $('#token-hud').addClass('monks-little-details').toggleClass('highlight-image', setting('alter-hud-colour'));
            const statuses = this._getStatusEffectChoices();

            for (let img of $('> img,> picture', '.col.right .status-effects')) {
                let src = $(img).attr('src');
                if (src == '') {
                    $(img).css({ 'visibility': 'hidden' });
                } else {
                    //const status = statuses[img.getAttribute("src")] || {};
                    let statusId = $(img).attr('data-status-id') || $(img).attr('data-condition');
                    let title = $(img).attr('data-tooltip') || $(img).attr('title');

                    var condition = CONFIG.statusEffects.find(c => c.id == statusId);
                    if (condition)
                        title = condition.name ? i18n(condition.name) : i18n(condition.label);

                    $(img).removeAttr('data-tooltip');

                    if (game.system.id == "pf2e") {
                        $('<div>')
                            .addClass('effect-name')
                            //.attr('title', title)
                            .html(title)
                            .insertAfter($('img', img));
                    } else {
                        $('<div>')
                            .addClass('effect-container')//$(img).attr('class'))
                            //.toggleClass('active', !!status.isActive)
                            //.attr('title', title)
                            //.attr('src', $(img).attr('src'))
                            .insertAfter(img)
                            .append(img)//.removeClass('effect-control'))
                            .append($('<div>').addClass('effect-name').html(title)
                            );
                    }
                }
            };

            $('.col.right .status-effects > div.pf2e-effect-img-container', html).each(function () {
                let img = $('img', this);
                let title = img.attr('data-condition');
                let div = $('<div>').addClass('effect-name').attr('title', title).html(title).insertAfter(img);
                //$(this).append(div);
                //const status = statuses[img.attr('src')] || {};
                //$(this).attr('src', img.attr('src')).toggleClass('active', !!status.isActive);
            });

            if (game.system.id !== 'pf2e' && setting("clear-all")) {
                $('.col.right .status-effects', html).append(
                    $('<div>').addClass('clear-all').html(`<i class="fas fa-times-circle"></i> ${i18n("MonksLittleDetails.ClearAll")}`).on("click", HUDChanges.clearAll.bind(this))
                );
            }

            if (setting('sort-statuses') == 'columns') {
                let rows = Math.max(Math.ceil(($('.status-effects', html).children().length - 1) / 4), 1);
                $('.status-effects', html).css({ 'grid-template-rows': `repeat(${rows}, ${100 / rows}%)`, 'grid-auto-flow': 'column' });
            }
        }
    }

    static async clearAll(e) {
        //find the tokenhud, get the TokenHUD.object  ...assuming it's a token?
        const statuses = this._getStatusEffectChoices();

        for (const [k, status] of Object.entries(statuses)) {
            if (status.isActive) {
                if (game.system.id == "dnd5e") {
                    const existing = this.object.actor.effects.find(e => e.statuses.has(status.id));
                    if (existing)
                        await this.object.actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id]);
                } else {
                    let effect = { id: status.id, icon: status.src };
                    if (game.system.id == "D35E" && !Object.keys(CONFIG.D35E.conditions).includes(status.id)) {
                        effect = status.id;
                    }
                    await this.object.toggleEffect(effect);
                }
            }
        }

        e.preventDefault();

        /*
        let selectedEffects = $('#token-hud .col.right .control-icon.effects .status-effects .effect-control.active');
        for (let ctrl of selectedEffects) {
            let img = $('img', ctrl).get(0);
            if (img != undefined) {
                const effect = (img.dataset.statusId && MonksLittleDetails.tokenHUD.object.actor) ?
                    CONFIG.statusEffects.find(e => e.id === img.dataset.statusId) :
                    img.getAttribute("src");

                await MonksLittleDetails.tokenHUD.object.toggleEffect(effect);
            }
        };*/
    }
}