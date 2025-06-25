import { registerSettings } from "./settings.js";
import { MMCQ } from "./quantize.js";
import { UpdateImages } from "./apps/update-images.js";
import { HUDChanges } from "./js/hud-changes.js";
import { MonksCompendium} from "./apps/compendium.js";

export let debugEnabled = 0;

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: monks-little-details | ", ...args);
};
export let log = (...args) => console.log("monks-little-details | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("WARN: monks-little-details | ", ...args);
};
export let error = (...args) => console.error("monks-little-details | ", ...args);

export const setDebugLevel = (debugText) => {
    debugEnabled = { none: 0, warn: 1, debug: 2, all: 3 }[debugText] || 0;
    // 0 = none, warnings = 1, debug = 2, all = 3
    if (debugEnabled >= 3)
        CONFIG.debug.hooks = true;
};

export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("monks-little-details", key);
};

export let patchFunc = (prop, func, type = "WRAPPER") => {
    let nonLibWrapper = () => {
        const oldFunc = eval(prop);
        eval(`${prop} = function (event) {
            return func.call(this, ${type != "OVERRIDE" ? "oldFunc.bind(this)," : ""} ...arguments);
        }`);
    }
    if (game.modules.get("lib-wrapper")?.active) {
        try {
            libWrapper.register("monks-little-details", prop, func, type);
        } catch (e) {
            nonLibWrapper();
        }
    } else {
        nonLibWrapper();
    }
}

export class MonksLittleDetails {
    static tokenHUDimages = {};
    static movingToken = false;

    static canDo(setting) {
        //needs to not be on the reject list, and if there is an only list, it needs to be on it.
        if (MonksLittleDetails._rejectlist[setting] != undefined && MonksLittleDetails._rejectlist[setting].includes(game.system.id))
            return false;
        if (MonksLittleDetails._onlylist[setting] != undefined && !MonksLittleDetails._onlylist[setting].includes(game.system.id))
            return false;
        return true;
    };

    static init() {
        if (game.MonksLittleDetails == undefined)
            game.MonksLittleDetails = MonksLittleDetails;

        try {
            Object.defineProperty(User.prototype, "isTheGM", {
                get: function isTheGM() {
                    return this == (game.users.find(u => u.hasRole("GAMEMASTER") && u.active) || game.users.find(u => u.hasRole("ASSISTANT") && u.active));
                }
            });
        } catch { }

        MonksLittleDetails.SOCKET = "module.monks-little-details";

        MonksLittleDetails._rejectlist = {
            "add-extra-statuses": ["pf2e"],
            "alter-hud": ["sfrpg"]
        }
        MonksLittleDetails._onlylist = {
            "sort-by-columns": ["dnd5e"],
            "show-combat-cr": ["dnd5e", "pf2e"]
        }

        registerSettings();
        MonksLittleDetails.registerHotKeys();

        if (setting("compendium-additional"))
            MonksCompendium.init();

        if (setting("reposition-collapse"))
            $('body').addClass("reposition-collapse");

        if (MonksLittleDetails.canDo("change-invisible-image") && setting("change-invisible-image"))
            CONFIG.controlIcons.visibility = "modules/monks-little-details/icons/invisible.svg";

        /*if (setting('context-view-artwork')) {
            let oldContextMenuOptions = Compendium.prototype._getContextMenuOptions;
            Compendium.prototype._contextMenu = function (html) {

                let compendium = this;
                new foundry.applications.ux.ContextMenu(html, ".directory-item", [
                    {
                        name: "View Scene Artwork",
                        icon: '<i class="fas fa-image fa-fw"></i>',
                        condition: li => compendium.entity == 'Scene',
                        callback: li => {
                            let entryId = li.attr('data-entry-id');
                            this.getEntity(entryId).then(entry => {
                                let img = entry.img;
                                if (VideoHelper.hasVideoExtension(img))
                                    ImageHelper.createThumbnail(img, { width: entry.width, height: entry.height }).then(img => {
                                        new ImagePopout(img.thumb, {
                                            title: entry.name,
                                            shareable: true,
                                            uuid: entry.uuid
                                        }).render(true);
                                    });
                                else {
                                    new ImagePopout(img, {
                                        title: entry.name,
                                        shareable: true,
                                        uuid: entry.uuid
                                    }).render(true);
                                }
                            });
                        }
                    },
                    {
                        name: "COMPENDIUM.ImportEntry",
                        icon: '<i class="fas fa-download"></i>',
                        callback: li => {
                            const entryId = li.attr('data-entry-id');
                            const entities = this.cls.collection;
                            return entities.importFromCollection(this.collection, entryId, {}, { renderSheet: true });
                        }
                    },
                    {
                        name: "COMPENDIUM.DeleteEntry",
                        icon: '<i class="fas fa-trash"></i>',
                        callback: li => {
                            let entryId = li.attr('data-entry-id');
                            this.getEntity(entryId).then(entry => {
                                return Dialog.confirm({
                                    title: `${game.i18n.localize("COMPENDIUM.DeleteEntry")} ${entry.name}`,
                                    content: game.i18n.localize("COMPENDIUM.DeleteConfirm"),
                                    yes: () => this.deleteEntity(entryId),
                                });
                            });
                        }
                    }
                ]);
            }
        }*/

        if (setting("alter-hud"))
            HUDChanges.init();

        let releaseAll = function (wrapped, ...args) {
            if (this.controlled.length) {
                let data = { tokens: this.controlled.map(t => t.document) };
                let id = window.setTimeout(() => {
                    if (id == MonksLittleDetails._selectedTokens.id)
                        delete MonksLittleDetails._selectedTokens;
                }, 400);
                data.id = id;
                MonksLittleDetails._selectedTokens = data;
            }
            return wrapped(...args);
        }

        patchFunc("foundry.canvas.layers.TokenLayer.prototype.releaseAll", releaseAll);

        patchFunc("foundry.canvas.groups.EffectsCanvasGroup.prototype.animateDarkness", function (wrapped, ...args) {
            let result = wrapped(...args);
            if (result !== false && game.user.isGM && setting("lighting-progress")) {
                let [target, { duration }] = args;

                if (duration > 0) {
                    let label = `Transitioning to ${target == 0 ? 'day' : 'night'}`;

                    if (MonksLittleDetails.darknessTimer) {
                        clearInterval(MonksLittleDetails.darknessTimer);
                        MonksLittleDetails.darknessTimer = undefined;
                    }
                    let bar = MonksLittleDetails.darknessBar;
                    if (!bar || !ui.notifications.has(bar)) {
                        bar = MonksLittleDetails.darknessBar = ui.notifications.info(label, { progress: true });
                    }

                    bar.update({ message: label, pct: 0 });
                    MonksLittleDetails.darknessTimer = setInterval(() => {
                        if (ui.notifications.has(bar)) {
                            let pct = 1.0 - Math.abs(target - canvas.environment.darknessLevel);
                            if (pct < 1.0) {
                                bar.update({ pct });
                                return;
                            }
                        }

                        clearInterval(MonksLittleDetails.darknessTimer);
                        MonksLittleDetails.darknessTimer = undefined;
                        MonksLittleDetails.darknessBar.remove();
                        MonksLittleDetails.darknessBar = undefined;
                    }, 50);
                }
            }
            return result;
        });

        patchFunc("foundry.canvas.placeables.Token.prototype._getDragConstrainOptions", function (wrapped, ...args) {
            let result = wrapped(...args);
            let moveKey = MonksLittleDetails.getMoveKey();

            if (game.user.isGM && moveKey && game.keyboard.downKeys.has(moveKey)) {
                result.ignoreWalls = true; //ignore walls when moving tokens with the m key
                result.ignoreCost = true; //ignore costs when moving tokens with the m key
            }

            return result;
        });

        patchFunc("foundry.applications.apps.FilePicker.prototype._onSubmit", async (wrapped, ...args) => {
            let [ev] = args;
            let path = ev.target.file.value;

            if (path && path.length) {
                let idx = path.lastIndexOf("/");
                let target = path.substring(0, idx);

                MonksLittleDetails.addQuickLink(target);
            }

            return wrapped(...args);
        });

        foundry.applications.api.DocumentSheetV2.prototype.constructor.DEFAULT_OPTIONS.actions.copyImagePath = MonksLittleDetails.onCopyImagePath;

        patchFunc("foundry.applications.api.DocumentSheetV2.prototype._renderFrame", function (wrapped, ...args) {
            const frame = wrapped(...args);
            if (this.document instanceof foundry.abstract.Document && this.document.id && (this.document.src || this.document.img || this.document.background?.src || this.document.texture?.src)) {
                const copyLabel = "Copy image file path";
                const copyId = `<button type="button" class="header-control fa-solid fa-file-image icon" data-action="copyImagePath"  data-tooltip="${copyLabel}" aria-label="${copyLabel}"></button>`;
                this.window.close.insertAdjacentHTML("beforebegin", copyId);
            }

            return frame;
        });

        /*
        patchFunc("foundry.canvas.layers.ControlsLayer.prototype.drawCursor", function (wrapped, ...args) {
            let result = wrapped(...args);
            let [user] = args;
            if (!user.hasPermission("SHOW_CURSOR")) {
                let cursor = this.cursors[user.id];
                if (cursor) cursor.visible = false;
            }
        });
        */

        if (game.settings.get("monks-little-details", "show-notify")) {
            patchFunc("foundry.applications.sidebar.tabs.ChatLog.prototype.notify", function (wrapped, ...args) {
                if (!this.rendered) return;

                let [message, { newMessage }] = args;

                // Post a chat card notification if the setting is enabled and this is a new message.
                if (!newMessage || !this._shouldShowNotifications()) {
                    // Only show the pip if we are not on the chat tab
                    if (ui.sidebar.tabGroups.primary != "chat") {
                        if (setting("highlight-notify"))
                            document.querySelector('#sidebar .tabs [data-tab="chat"]')?.classList.add("highlight");
                        else
                            document.querySelector('#sidebar .tabs [data-tab="chat"] + .notification-pip')?.classList.add("active");
                    }

                    if (message.sound) game.audio.play(message.sound, { context: game.audio.interface });
                } else {
                    wrapped(...args);
                    // Still show the pip if we aren't on the chat tab, so that the user knows they have new messages
                    if (ui.sidebar.tabGroups.primary != "chat") {
                        if (setting("highlight-notify"))
                            document.querySelector('#sidebar .tabs [data-tab="chat"]')?.classList.add("highlight");
                        else
                            document.querySelector('#sidebar .tabs [data-tab="chat"] + .notification-pip')?.classList.add("active");
                    }
                }
            }, "MIXED");
        }

        patchFunc("foundry.applications.sidebar.tabs.ActorDirectory.prototype.renderPopout", function (wrapped, ...args) {
            if (setting("open-actor")) {
                if (game.user.isGM) {
                    if (MonksLittleDetails._lastActor)
                        MonksLittleDetails._lastActor.sheet.render(true, { focus: true });
                    else
                        return wrapped(...args);
                } else {
                    if (game.user.character)
                        game.user.character.sheet.render(true, { focus: true });
                    else
                        return wrapped(...args);
                }
            } else
                return wrapped(...args);
        }, "MIXED");

        patchFunc("foundry.applications.api.ApplicationV2.prototype.setPosition", function (wrapped, ...args) {
            let [options] = args;
            let { left } = (options || {});
            let noPosition = !this.position || !this.position.left;
            let noLeft = !left;
            let result = wrapped(...args);
            [options] = args;
            left = (options || {}).left;
            let scale = (options || {}).scale;
            if (noLeft && noPosition && this.hasFrame && setting("dual-monitor") != "none") {
                const el = this.element;
                let current_scale = this.position.scale;
                let current_left = this.position.left;
                if (scale === null) scale = 1;
                scale = scale ?? current_scale ?? 1;

                const scaledWidth = this.position.width * scale;
                const tarL = ((window.innerWidth / 2) - scaledWidth) / 2 + (setting("dual-monitor") == "right" ? (window.innerWidth / 2) : 0);
                const maxL = Math.max(window.innerWidth - scaledWidth, 0);
                current_left = left = Math.clamp(tarL, 0, maxL);
                el.style.left = `${current_left}px`;

                result.left = current_left;
            }

            return result;
        });

        /*
        patchFunc("foundry.canvas.layers.ControlsLayer.prototype.handlePing", function (wrapped, ...args) {
            let [user, position, options] = args;
            if (setting("dual-monitor") != "none") {
                var offset = (window.innerWidth / 2) * (setting("dual-monitor") == "right" ? 1 : -1);
                position.x += offset;

            }
            return wrapped(...args);
        });
        */
    }

    static onCopyImagePath = function (event) {
        let src = (this.document.src || this.document.img || this.document.background?.src || this.document.texture?.src);
        event.preventDefault();
        event.stopPropagation(); // Don't trigger other events
        if (event.detail > 1) return; // Ignore repeated clicks
        const label = game.i18n.localize(this.document.constructor.metadata.label);

        game.clipboard.copyPlainText(src);
        ui.notifications.info(`${label} image ${src} copied to clipboard`);
    };

    static addQuickLink(target, favorite = false) {
        let quicklinks = (game.user.getFlag("monks-little-details", "quicklinks") || []);
        let link = quicklinks.find(q => q.target == target);

        let favorites = [];
        let regular = quicklinks.filter(q => {
            if (q.favorite) favorites.push(q);
            return !q.favorite;
        });

        // if this link already exists
        //      if a favorite then do nothing, not a favorite, then sort it to the top of the list
        // if this link doesn't exist
        // check to see if there are any non-favorite spots available and push to the list.  Pop any that are greater than 25

        if (link) {
            if (!link.favorite) {
                regular.findSplice(q => q.target == target);
                regular.unshift(link);
            }
        } else {
            if (favorites.length < 25) {
                regular.unshift({ target: target, favorite });
                if (regular.length + favorites.length > 25)
                    regular = regular.slice(0, 25 - favorites.length);

                $(".quick-link-input-button").each(function () {
                    let input = $(this).next().val();
                    if (input == target) {
                        $("i", this).attr("class", `fa-star ${favorite ? "fa-solid" : "fa-regular"}`)
                    }
                });
            }
        }

        quicklinks = favorites.concat(regular);
        game.user.setFlag("monks-little-details", "quicklinks", quicklinks);

        MonksLittleDetails.buildQuickLinks(quicklinks, $('ul.quick-links-list'));
    }

    static buildQuickLinks(quicklinks, lists) {
        let favorites = [];
        let regular = quicklinks.filter(q => {
            if (q.favorite) favorites.push(q);
            return !q.favorite;
        })

        if (lists.length) {
            for (let l of lists) {
                let list = $(l);
                list.empty();
                if (quicklinks.length == 0)
                    list.append($("<li>").addClass('no-quick-links').html("No quick links yet"));
                else {
                    list.append(favorites.concat(regular).map(j => {
                        return $('<li>')
                            .addClass('quick-link-item flexrow')
                            .attr('target', j.target)
                            .append($('<div>').addClass('quick-favorite').html(`<i class="fa-star ${j.favorite ? "fa-solid" : "fa-regular"}"></i>`).click(MonksLittleDetails.toggleFavorite.bind(j, j.target)))
                            .append($('<div>').addClass('quick-title').html(j.target ? j.target : "-- root --"))
                            .click(MonksLittleDetails.selectQuickLink.bind(l, j.target));
                    }));
                }
            };
        }
    }

    static toggleFavorite(target, event) {
        event.preventDefault();
        event.stopPropagation();

        let quicklinks = foundry.utils.duplicate(game.user.getFlag("monks-little-details", "quicklinks") || []);
        let link = quicklinks.find(q => q.target == target);
        link.favorite = !link.favorite;
        game.user.setFlag("monks-little-details", "quicklinks", quicklinks);
        $(`.quick-link-item[target="${target}"] .quick-favorite i`).toggleClass("fa-solid", link.favorite).toggleClass("fa-regular", !link.favorite);

        $(".quick-link-input-button").each(function () {
            let target = $(this).next().val();
            if (target == link.target) {
                $("i", this).attr("class", `fa-star ${link?.favorite ? "fa-solid" : "fa-regular"}`)
            }
        });
    }

    static selectQuickLink(target, event) {
        event.preventDefault();
        event.stopPropagation();
        this.app.browse(target);
        $('.quick-links-list.open').removeClass('open');
    }

    static async ready() {
        if (MonksLittleDetails.canDo("add-extra-statuses") && setting("add-extra-statuses")) {
            CONFIG.statusEffects = CONFIG.statusEffects.concat(setting("additional-effects") || []);
        }

        MonksLittleDetails.injectCSS();

        if (setting("pause-border") && game.paused && $('#board').length) {
            $("body").addClass("mld-paused");
        } else
            $("body").removeClass("mld-paused");

        try {
            let actorId = game.user.getFlag("monks-little-details", "last-actor");
            if (actorId)
                MonksLittleDetails._lastActor = await fromUuid(actorId);
        } catch { }

        const sortingModes = game.settings.get("core", "collectionSortingModes");
        if (sortingModes["CompendiumPacks"] == undefined && setting("compendium-additional")) {
            sortingModes["CompendiumPacks"] = "t";
            game.settings.set("core", "collectionSortingModes", sortingModes);
        }

        $('body').toggleClass("change-windows", setting("window-css-changes"));
        $('body').toggleClass("change-chat", setting("chat-css-changes"));

        game.settings.settings.get("monks-little-details.find-my-token").default = !game.user.isGM;

        HUDChanges.ready();
        game.socket.on(MonksLittleDetails.SOCKET, MonksLittleDetails.onMessage);

        //remove notify
        $('#sidebar .tabs button[role="tab"]').on('click.monks-little-details', function (event) {
            let pip = $(event.currentTarget).siblings(".notification-pip");
            pip.removeClass("active");
            $(event.currentTarget).removeClass("highlight"); 
        });

        if (game.MonksCombatDetails && game.settings.get("monks-little-details", "show-notify")) {
            game.MonksCombatDetails.combatNotify = () => {
                if (ui.sidebar.tabGroups.primary != "combat") {
                    if (setting("highlight-notify"))
                        $('#sidebar .tabs [data-tab="combat"]').addClass("highlight");
                    else
                        $('#sidebar .tabs [data-tab="combat"] + .notification-pip').addClass("active");
                }
            }
        }
    }

    static registerHotKeys() {
        game.keybindings.register('monks-little-details', 'movement-key', {
            name: 'MonksLittleDetails.movement-key.name',
            hint: 'MonksLittleDetails.movement-key.hint',
            editable: [{ key: 'KeyM' }],
            restricted: true,
        });

        game.keybindings.register('monks-little-details', 'release-targets', {
            name: 'MonksLittleDetails.release-targets.name',
            editable: [{ key: "KeyT", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS?.ALT]}],
            restricted: false,
            onDown: () => {
                for (let t of game.user.targets) {
                    t.setTarget(false, { user: game.user, releaseOthers: false, groupSelection: true });
                }
            },
        });

        if (game.settings.get("monks-little-details", "key-swap-tool")) {
            let layers = [
                { name: "Token Layer", tool: 'tokens', def: "KeyG", restricted: false },
                { name: "Measure Layer", tool: 'templates', restricted: false },
                { name: "Tile Layer", tool: 'tiles', def: "KeyH", restricted: true },
                { name: "Drawing Layer", tool: 'drawings', restricted: false },
                { name: "Wall Layer", tool: 'walls', restricted: true },
                { name: "Lighting Layer", tool: 'lighting', def: "KeyJ", restricted: true },
                { name: "Sound Layer", tool: 'sounds', def: "KeyK", restricted: true },
                { name: "Region Layer", tool: 'regions', restricted: true },
                { name: "Note Layer", tool: 'notes', restricted: false }
            ];
            if (game.modules["enhanced-terrain-layer"]?.active)
                layers.push({ name: i18n("MonksLittleDetails.TerrainLayer"), tool: 'terrain', def: "KeyL", restricted: true });

            layers.map(l => {
                game.keybindings.register('monks-little-details', `swap-${l.tool}-control`, {
                    name: `Quick show ${l.name}`,
                    editable: (l.def ? [{ key: l.def }] : []),
                    restricted: l.restricted,
                    onDown: () => { MonksLittleDetails.swapTool(l.tool, true); },
                    onUp: () => { MonksLittleDetails.releaseTool(); }
                });
                game.keybindings.register('monks-little-details', `change-${l.tool}-control`, {
                    name: `Change to ${l.name}`,
                    editable: (l.def ? [{ key: l.def, modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS?.SHIFT] }] : []),
                    restricted: l.restricted,
                    onDown: () => { MonksLittleDetails.swapTool(l.tool, false); },
                });
            });
        }
    }

    static swapTool(controlName, quick = true) {
        let control = ui.controls.control;
        if (control.name != controlName && MonksLittleDetails.switchTool == undefined) {
            if (quick !== false) //e?.shiftKey
                MonksLittleDetails.switchTool = { control: control, tool: control.activeTool };
            let newcontrol = ui.controls.controls[controlName];
            if (newcontrol != undefined) {
                (canvas[newcontrol.layer] || canvas[controlName]).activate();
            }
        }
    }

    static releaseTool() {
        if (MonksLittleDetails.switchTool != undefined) {
            if (MonksLittleDetails.switchTool.control) {
                (canvas[MonksLittleDetails.switchTool.control.layer] || canvas[MonksLittleDetails.switchTool.control.name]).activate();
            }
            delete MonksLittleDetails.switchTool;
        }
    }

    static injectCSS() {
        let innerHTML = '';
        let style = document.createElement("style");
        style.id = "monks-css-changes";
        if (setting("core-css-changes")) {
            innerHTML += `
.directory:not(.compendium-sidebar) .directory-list .directory-item img {
    object-fit: contain !important;
    object-position: center !important;
}

.directory:not(.compendium-sidebar) .directory-list .directory-item > i.fa-user {
    font-size: 40px;
    width: 40px;
}

#file-picker ul.thumbs img {
    object-fit: contain !important;
    object-position: center !important;
}

.control-icon.active > img {
    filter: sepia(100%) saturate(2000%) hue-rotate(-50deg);
}

.control-icon.active > i {
    color: #ffc163;
    opacity: 0.7;
}

.control-icon.active:hover > i {
    opacity:1;
}

#context-menu li.context-item{
    text-align: left;
}

#controls ol.control-tools .has-notes::after {
    color: #bc8c4a;
}

#controls ol.control-tools .has-notes::before {
    color: #bc8c4a;
}

#controls ol.control-tools li.active .has-notes::before,
#controls ol.control-tools li:hover .has-notes::before {
    color: #ffc163;
}
`;

        }


        var r = document.querySelector(':root');
        r.style.setProperty('--sidebar-padding', `${setting("directory-padding")}px`);
        const rgb = Color.from(setting("pause-border-colour")).rgb;
        r.style.setProperty('--pause-border-color', `${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255}`);

        style.innerHTML = innerHTML;
        if (innerHTML != '')
            document.querySelector("head").appendChild(style);
    }

    static getMoveKey() {
        let keys = game.keybindings.bindings.get("monks-little-details.movement-key");
        if (!keys || keys.length == 0)
            return;

        return keys[0].key;
    }

    static async moveTokens(event) {
        let moveKey = MonksLittleDetails.getMoveKey();

        if (game.user.isGM && moveKey && game.keyboard.downKeys.has(moveKey)) {
            let tokens = canvas.tokens.controlled.map(t => t.document);
            if (!tokens.length && MonksLittleDetails._selectedTokens?.tokens)
                tokens = MonksLittleDetails._selectedTokens.tokens;
            if (tokens.length > 0) {
                let pos = event.data.getLocalPosition(canvas.app.stage);
                let gs = canvas.scene.dimensions.size;
                pos.x = Math.floor(pos.x / gs) * gs;
                pos.y = Math.floor(pos.y / gs) * gs;

                let mid = {
                    x: tokens[0].x,
                    y: tokens[0].y
                };
                for (let i = 1; i < tokens.length; i++) {
                    mid.x += tokens[i].x;
                    mid.y += tokens[i].y;
                }
                mid.x = (mid.x / tokens.length);
                mid.y = (mid.y / tokens.length);

                let updates = [];
                for (let i = 0; i < tokens.length; i++) {
                    let offset = { x: tokens[i].x - mid.x, y: tokens[i].y - mid.y };
                    let pt = { x: pos.x + offset.x, y: pos.y + offset.y };
                    //let shift = { x: Math.floor(((tokens[i].width * gs) / 2) / gs) * gs, y: Math.floor(((tokens[i].height * gs) / 2) / gs) * gs };
                    //pt = { x: pt.x - shift.x, y: pt.y - shift.y };
                    pt.x = Math.floor(pt.x / gs) * gs;
                    pt.y = Math.floor(pt.y / gs) * gs;

                    //t.update({ x: px[0], y: px[1] }, { animate: false });
                    updates.push({ _id: tokens[i].id, x: pt.x, y: pt.y });
                }
                if (updates.length) {
                    MonksLittleDetails.movingToken = true;
                    await canvas.scene.updateEmbeddedDocuments("Token", updates, { animate: false, bypass: true });
                    MonksLittleDetails.movingToken = false;
                }
            }
        }
    }

    static rgbToHex(r, g, b) {
        var componentToHex = function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    static createPixelArray(imgData, pixelCount, quality) {
        const pixels = imgData;
        const pixelArray = [];

        for (let i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
            offset = i * 4;
            r = pixels[offset + 0];
            g = pixels[offset + 1];
            b = pixels[offset + 2];
            a = pixels[offset + 3];

            // If pixel is mostly opaque and not white
            if (typeof a === 'undefined' || a >= 125) {
                if (!(r > 250 && g > 250 && b > 250)) {
                    pixelArray.push([r, g, b]);
                }
            }
        }
        return pixelArray;
    }

    static getPalette(src, element, ctrl, fn) {
        // Create custom CanvasImage object
        if (src != undefined) {
            foundry.canvas.loadTexture(src).then((texture) => {
                if (texture != undefined) {
                    // Create a temporary Sprite using the Tile texture
                    const sprite = new PIXI.Sprite(texture);
                    sprite.width = texture.width;
                    sprite.height = texture.height;
                    sprite.anchor.set(0.5, 0.5);
                    sprite.position.set(texture.width / 2, texture.height / 2);

                    // Create or update the alphaMap render texture
                    const tex = PIXI.RenderTexture.create({ width: texture.width, height: texture.height });

                    // Render the sprite to the texture and extract its pixels
                    canvas.app.renderer.render(sprite, { renderTexture: tex });
                    let pixels = canvas.app.renderer.extract.pixels(tex);
                    tex.destroy(true);

                    const pixelCount = texture.width * texture.height;

                    const pixelArray = MonksLittleDetails.createPixelArray(pixels, pixelCount, 10);

                    if (pixelArray.length == 0) {
                        $(element).remove();
                        return;
                    }

                    sprite.destroy();

                    // Send array to quantize function which clusters values
                    // using median cut algorithm
                    const cmap = MMCQ.quantize(pixelArray, 5);
                    const palette = cmap ? cmap.palette() : [];

                    $(element).empty();
                    for (let i = 0; i < palette.length; i++) {
                        var hexCode = MonksLittleDetails.rgbToHex(palette[i][0], palette[i][1], palette[i][2]);
                        $(element).append($('<div>').addClass('background-palette').attr('title', hexCode).css({ backgroundColor: hexCode }).on('click', $.proxy(fn, MonksLittleDetails, hexCode, ctrl, element)));
                    }
                }
            })
        }
    };

    static async updateSceneBackground(hexCode, ctrl, element) {
        $('.background-palette-container', element).remove();
        await MonksLittleDetails.currentScene.update({ backgroundColor: hexCode });
    }

    static updatePlayerColour(hexCode, ctrl, element) {
        $('.background-palette-container', element).remove();
        $('input', ctrl).val(hexCode).get(0).dispatchEvent(new Event('change'));   
    }

    static emit(action, args = {}) {
        args.action = action;
        args.senderId = game.user.id;
        game.socket.emit(MonksLittleDetails.SOCKET, args, (resp) => { });
    }

    static onMessage(data) {
        MonksLittleDetails[data.action].call(MonksLittleDetails, data);
    }

    static isDefeated(token) {
        return (token && (token.combatant && token.combatant.defeated) || token.actor?.effects.find(e => e.getFlag("core", "statusId") === CONFIG.specialStatusEffects.DEFEATED) || token.document.overlayEffect == CONFIG.controlIcons.defeated);
    }

    static showUpdateImages() {
        new UpdateImages().render(true);
    }
}
    

Hooks.once('init', MonksLittleDetails.init);
Hooks.on("ready", MonksLittleDetails.ready);

Hooks.on("canvasReady", () => {
    canvas.stage.on("mousedown", MonksLittleDetails.moveTokens);    //move all tokens while holding down m
});

Hooks.on('renderSceneConfig', async (app, html, options) => {
    if (game.settings.get("monks-little-details", 'scene-palette')) {
        MonksLittleDetails.currentScene = app.document;

        let backgroundColor = $('color-picker[name="backgroundColor"]', html);
        backgroundColor.css({ position: 'relative' });
        $('<button>').attr('type', 'button').html('<i class="fas fa-palette"></i>').on('click', function (e) {
            let element = $(this).siblings('.background-palette-container');
            if (element.length == 0) {
                element = $('<div>').addClass('background-palette-container flexrow').insertAfter(this);
                MonksLittleDetails.getPalette(MonksLittleDetails.currentScene.background.src, element, "", MonksLittleDetails.updateSceneBackground);
            } else {
                element.remove();
            }
            e.preventDefault();
            e.stopPropagation();
        }).appendTo(backgroundColor);

        $(html).on("click", () => { $('.background-palette-container', html).remove(); });
    }

    app.setPosition({ height: 'auto' });
});

Hooks.on('renderUserConfig', async (app, html, options) => {
    if (game.settings.get("monks-little-details", 'scene-palette') && app.document.avatar) {
        MonksLittleDetails.currentUser = app.document;

        let playerColor = $(`color-picker[name="color"]`, app.element);
        playerColor.css({ position: 'relative' });
        $('<button>').attr('type', 'button').html('<i class="fas fa-palette"></i>').on('click', function (e) {
            let element = $(this).siblings('.background-palette-container');
            if (element.length == 0) {
                element = $('<div>').addClass('background-palette-container flexrow').insertAfter(this);
                let avatar = $(`file-picker[name="avatar"] input`, app.element).val();
                MonksLittleDetails.getPalette(avatar, element, playerColor, MonksLittleDetails.updatePlayerColour);
            } else {
                element.remove();
            }
            e.preventDefault();
            e.stopPropagation();
        }).appendTo(playerColor);
    }

    $(app.element).on("click", () => { $('.background-palette-container', app.element).remove(); });

    app.setPosition({ height: 'auto' });
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
    $('<p>').addClass('mld-warning').append('<i class="fas fa-circle-question"></i> Where have all of my features gone? ').append($('<a>').html("Click here").on("click", () => { new ModuleWarning().render(true); })).insertBefore($('[name="monks-little-details.alter-hud"]').parents('div.form-group:first'));
    $('<div>').addClass('form-group group-header').html(i18n("MonksLittleDetails.SystemChanges")).insertBefore($('[name="monks-little-details.alter-hud"]').parents('div.form-group:first'));
    $('<div>').addClass('form-group group-header').html(i18n("MonksLittleDetails.AddedFeatures")).insertBefore($('[name="monks-little-details.scene-palette"]').parents('div.form-group:first'));

    let pauseBorder = $('input[name="monks-little-details.pause-border-colour"]').val();
    pauseBorder = pauseBorder.slice(0, 7);
    if (pauseBorder && !pauseBorder.startsWith("#")) {
        pauseBorder = "#" + pauseBorder;
    }
    let pauseColour = $(`<color-picker style="flex: 0 0 140px;" value="${pauseBorder}" name="monks-little-details.pause-border-colour">`);
    $('input[name="monks-little-details.pause-border-colour"]').replaceWith(pauseColour);
});

Hooks.on("renderCompendium", (compendium, html, data) => {
    if (setting('compendium-view-artwork')) {
        if (compendium.collection.documentName == 'Scene') {
            $(html).find('li.directory-item a').each((idx, elem) => {
                $(elem).wrap($('<div class="directory-item-container"></div>').click(async (ev) => {
                    ev.preventDefault();
                    const { entryId } = ev.currentTarget.closest("[data-entry-id]").dataset;
                    const document = compendium.collection.get(entryId) ?? await compendium.collection.getDocument(entryId);
                    document.sheet.render(true);
                })).after($('<i class="fa-solid fa-image"></i>').click(ev => {
                    ev.preventDefault();
                    ev.cancelBubble = true;
                    if (ev.stopPropagation)
                        ev.stopPropagation();

                    const { entryId } = ev.currentTarget.closest('[data-entry-id]').dataset;
                    compendium.collection.getDocument(entryId).then(entry => {
                        let img = entry.background.src;
                        if (img) {
                            if (foundry.helpers.media.VideoHelper.hasVideoExtension(img))
                                foundry.helpers.media.ImageHelper.createThumbnail(img, { width: entry.width, height: entry.height }).then(img => {
                                    new foundry.applications.apps.ImagePopout({
                                        window: {
                                            title: entry.name
                                        },
                                        src: img.thumb,
                                        shareable: true,
                                        uuid: entry.uuid
                                    }).render(true);
                                });
                            else {
                                new foundry.applications.apps.ImagePopout({
                                    window: {
                                        title: entry.name,
                                    },
                                    src: img,
                                    shareable: true,
                                    uuid: entry.uuid
                                }).render(true);
                            }
                        } else {
                            ev.currentTarget.parentElement.click();
                        }
                    });
                }));
            });
        }
    }
    /*
    if (compendium.entity == 'Playlist') {
        compendium._onEntry = async (entryId) => {
            //for the playlist I want to expand the directory structure
            let li = $('li[data-entry-id="' + entryId + '"]', compendium.element);
            let dir = $('.play-list-sounds', li);
            if (dir.length == 0) {
                dir = $('<ol>').addClass('play-list-sounds').appendTo(li);
                const entity = await compendium.getEntity(entryId);
                $(entity.sounds).each(function () {
                    let sound = this;
                    $('<li>').addClass('play-sound').html(this.name).appendTo(dir).on('click', $.proxy((sound, entity, li, ev)=>{
                        if (sound != undefined) {
                            //let path = li.attr('data-sound-path');
                            if (compendium.currentsound != undefined) {
                                if (compendium.currentsound.sound.playing) {
                                    compendium.currentsound.sound.playing = false;
                                    compendium.currentsound.audio.stop();
                                }
                            }
                            if (compendium.currentsound == undefined || compendium.currentsound.sound.path != sound.path) {
                                sound.playing = true;
                                let audio = foundry.audio.AudioHelper.play({ src: sound.path });
                                compendium.currentsound = {
                                    sound: sound,
                                    audio: audio
                                };
                            }
                        }
                    }, compendium, sound, entity, li));
                });

                new DragDrop({
                    dragSelector: ".play-list-sounds .play-sound",
                    dropSelector: "#playlists .directory-list .directory-item.playlist",
                    callbacks: {
                        dragstart: (ev) => {
                            ev.preventDefault();
                            log('play sound drag start', ev);
                             },
                        dragover: (ev) => {
                            ev.preventDefault();
                            log('play sound drag over', ev);
                             },
                        drop: (ev) => {
                            ev.preventDefault();
                            log('play sound drag drop', ev);
                             }
                    }
                }).bind(dir[0]);
            }
            dir.hide().slideDown(200);
        }
    }*/
});

Hooks.on("preUpdateToken", (document, update, options, userId) => {
    let moveKey = MonksLittleDetails.getMoveKey();

    if ((update.x != undefined || update.y != undefined) && game.user.isGM && moveKey && game.keyboard.downKeys.has(moveKey)) {
        options.animate = false;
        options.bypass = true;
    }
});

Hooks.on("getSceneControlButtons", (controls) => {
    if (setting("find-my-token")) {
        let tokenControls = controls["tokens"];
        tokenControls.tools["findtoken"] = {
            name: "findtoken",
            title: "MonksLittleDetails.FindMyToken",
            icon: "fas fa-users-viewfinder",
            onClick: async (away) => {
                //Find token
                let tokens = canvas.tokens.ownedTokens;
                if (tokens.length == 0) return;

                let lastTime = game.user.getFlag('monks-little-details', 'findTime');
                let lastIdx = (lastTime == undefined || (Date.now() - lastTime) > 2000 ? 0 : game.user.getFlag('monks-little-details', 'findIdx') || 0);

                if (lastIdx >= tokens.length)
                    lastIdx = 0;

                let token = tokens[lastIdx];
                if (!token) return;

                canvas.animatePan({ x: token.x, y: token.y });
                token.control({ releaseOthers: true });

                lastIdx = (lastIdx + 1) % tokens.length;
                await game.user.setFlag('monks-little-details', 'findTime', Date.now());
                await game.user.setFlag('monks-little-details', 'findIdx', lastIdx);
            },
            button: true
        };
    }
});


/*
Hooks.on('renderAmbientSoundConfig', (app, html, data) => {
    $('<div>')
        .addClass('form-group')
        .append($('<label>').html('Repeat Delay'))
        .append($('<div>').addClass('form-fields').append($('<input>').attr('type', 'number').attr('name', 'flags.monks-little-details.loop-delay').attr('step', '1').val(app.document.getFlag('monks-little-details', 'loop-delay'))))
        .append($('<p>').addClass('hint').html('Specify the time between loops, set to -1 to have this play only once'))
        .insertBefore($('button[name="submit"]', html));
})*/

Hooks.on("renderActorSheetV2", (sheet) => {
    MonksLittleDetails._lastActor = sheet.document;
    game.user.setFlag("monks-little-details", "last-actor", sheet.document.uuid);
})

Hooks.on("getFolderContextOptions", (app, entries) => {
    entries.splice(4, 0, {
        name: "FOLDER.Clear",
        icon: '<i class="fas fa-folder"></i>',
        condition: game.user.isGM,
        callback: header => {
            const li = header.parentElement;
            const folder = game.folders.get(li.dataset.folderId);
            if (folder) {
                return foundry.applications.api.DialogV2.confirm({
                    window: {
                        title: `${i18n("FOLDER.Clear")} ${folder.name}`,
                    },
                    position: {
                        top: Math.min(li.offsetTop, window.innerHeight - 350),
                        left: window.innerWidth - 720,
                        width: 400
                    },
                    content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${i18n("MonksLittleDetails.ClearWarning")}</p>`,
                    yes: {
                        callback: () => {
                            // Delete contained Documents
                            const deleteDocumentIds = [];
                            for (let d of folder.documentCollection) {
                                if (d.folder?.id !== folder.id) continue;
                                deleteDocumentIds.push(d.id);
                            }
                            if (deleteDocumentIds.length) {
                                const cls = getDocumentClass(folder.type);
                                return cls.deleteDocuments(deleteDocumentIds);
                            }
                        }
                    }
                });
            }
        }
    });
});

Hooks.on("renderMacroConfig", (app, html, data) => {
    $('.form-footer', html).prepend(
        $("<button>")
            .attr("type", "button")
            .html('<i class="fas fa-file-download"></i> Apply')
            .on("click", (event) => {
                event.currentTarget = event.currentTarget.closest('form');
                app._onSubmitForm.call(app, {
                    closeOnSubmit: false,
                    handler: async function (event, form, formData, options = {}) {
                        if (!this.isEditable) return;
                        const { updateData, ...updateOptions } = options;
                        const submitData = this._prepareSubmitData(event, form, formData, updateData);
                        await this._processSubmitData(event, form, submitData, updateOptions);
                        ui.notifications.info("Macro saved");
                    }
                }, event);
            }));
})

Hooks.on('renderModuleManagement', (app, html, data) => {
    if (setting("module-management-changes")) {
        let requires = {};

        let scrollToView = function (ev) {
            let module = $(ev.currentTarget).html();
            let div = $(`.package[data-module-id="${module}"]`, html);
            if (div.length) {
                div[0].scrollIntoView({ behavior: "smooth" });
            }
        }

        for (let mod of data.modules) {
            if (mod.relationships.requires.length) {
                for (let dep of mod.relationships.requires) {
                    if (requires[dep.id] == undefined)
                        requires[dep.id] = [mod.id];
                    else
                        requires[dep.id].push(mod.id);

                    let hasModule = data.modules.find(m => m.id == dep.id);
                    $(`.package[data-module-id="${mod.id || mod.name}"] .package-metadata .tag`, html).each(function () {
                        if ($(this).html() == dep.id) {
                            $(this).addClass(hasModule ? (hasModule.active ? "success" : "info") : "danger");
                        }
                        $(this).on("click", scrollToView.bind(this));
                    });
                }
            }
        }

        for (let [req, values] of Object.entries(requires)) {
            let li = $('<li>').appendTo($(`.package[data-module-id="${req}"] .package-metadata`, html));
            li.append($("<strong>").html("Supports:"));
            for (let val of values) {
                li.append($("<span>").addClass("tag warning").html(val).on("click", scrollToView.bind(this)));
            }
        }
    }
});

Hooks.on("getActorContextOptions", (app, entries) => {
    if (game.system.id == "dnd5e") {
        entries.push({
            name: "Transform into this Actor",
            icon: '<i class="fas fa-random"></i>',
            condition: li => {
                if (canvas.tokens.controlled.length == 0 && (game.user.isGM || !game.user.character)) return false;
                const actor = game.actors.get(li.dataset.entryId);
                const canPolymorph = game.user.isGM || (actor.isOwner && game.user.can("TOKEN_CREATE") && game.settings.get("dnd5e", "allowPolymorphing"));
                return canPolymorph;
            },
            callback: async (li) => {
                let from;
                if (app.collection instanceof foundry.documents.collections.CompendiumCollection)
                    from = await app.collection.getDocument(li.dataset.entryId);
                else
                    from = app.collection.get(li.dataset.entryId);

                if (!from) return;

                let actors = canvas.tokens.controlled.map(t => t.actor);

                if (actors.length == 0 && !game.user.isGM)
                    actors = [game.user.character];

                for (let actor of actors) {
                    actor.sheet._onDropActor({ preventDefault: () => { }, target: { closest: () => { return false } } }, from);
                }
            }
        });
    }
});

Hooks.on("renderFilePicker", (app, html, data) => {
    if (setting("add-quicklinks")) {
        $(app.element).addClass("use-quicklinks");
        if ($('button.quick-links', html).length)
            return;

        let quicklinks = game.user.getFlag("monks-little-details", "quicklinks") || [];

        let list = $('<ul>').addClass('quick-links-list');
        list[0].app = app;

        MonksLittleDetails.buildQuickLinks(quicklinks, list);
        let link = quicklinks.find(q => q.target == app.result.target);

        $(html).click(function () { list.removeClass('open') });

        $('input[name="target"]', html)
            .css({ "padding-left": "25px" })
            .before(
                $("<button>")
                    .attr("type", "button")
                    .attr("data-tooltip", "Add to quicklinks")
                    .addClass("quick-link-input-button")
                    .append($("<i>").addClass(`fa-star ${link?.favorite ? "fa-solid" : "fa-regular"}`))
                    .click(function (ev) {
                        let target = $('input[name="target"]', html).val();
                        let quicklinks = foundry.utils.duplicate(game.user.getFlag("monks-little-details", "quicklinks") || []);
                        let link = quicklinks.find(q => q.target == target);
                        if (link) {
                            MonksLittleDetails.toggleFavorite(target, ev);
                        } else {
                            MonksLittleDetails.addQuickLink(target, true);
                        }

                        ev.preventDefault();
                        ev.stopPropagation();
                        $('input[name="target"]', html).focus();
                    })
            )
            .after(
                $("<button>")
                    .attr("type", "button")
                    .addClass("quick-links")
                    .append($("<i>").addClass("fas fa-caret-down"))
                    .click(function (ev) {
                        //$('.quick-links-list', html).removeClass('open');
                        list.toggleClass('open');
                        ev.preventDefault();
                        ev.stopPropagation();
                    })
            )
            .after(list);
        $('input[name="target"]', html).parent().css({ position: "relative" });
    }

    if (setting("remove-favorites")) {
        $(".set-favorite", html).closest(".form-group").remove();
    }
});

Hooks.on("renderDocumentDirectory", (app, html, data) => {
    let parseTree = (node) => {
        for (let child of node.children) {
            if (child.folder.color) {
                $(`.directory-item.folder[data-folder-id="${child.folder.id}"] > .subdirectory`, html).css("border-bottom-color", child.folder.color);
            }
            parseTree(child);
        }
    }
    parseTree(data.tree);
});

Hooks.on("pauseGame", (state) => {
    if (setting("pause-border")) {
        $("body").toggleClass("mld-paused", state && $('#board').length > 0);
    }
});

Hooks.on("renderChatMessageHTML", (app, html, data) => {
    $(".message-timestamp", html).attr("title", new Date(data.message.timestamp).toLocaleString());
});

Hooks.on("renderMainMenu", (app, html, data, options) => {
    $("#menu").click((ev) => {
        if (ui.menu.rendered) {
            ui.menu.toggle();
        }
    });
});