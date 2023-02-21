﻿import { registerSettings } from "./settings.js";
import { MMCQ } from "./quantize.js";
import { WithMonksCombatTracker } from "./apps/combattracker.js";
import { UpdateImages } from "./apps/update-images.js";
//import { MonksPlaylistConfig } from "./apps/monksplaylistconfig.js";
import { BloodSplats } from "./js/bloodsplats.js";
import { CombatBars } from "./js/combat-bars.js";
import { CombatMarker } from "./js/combat-marker.js";
import { CombatTurn } from "./js/combat-turn.js";
import { ActorSounds } from "./js/actor-sounds.js";
import { ChatTimer } from "./js/chat-timer.js";
import { HUDChanges } from "./js/hud-changes.js";

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
    if (debugEnabled >= 3) CONFIG.debug.hooks = true;
};

export let i18n = (key) => {
    return game.i18n.localize(key);
};
export let setting = (key) => {
    if (MonksLittleDetails._setting.hasOwnProperty(key)) return MonksLittleDetails._setting[key];
    else return game.settings.get("monks-little-details", key);
};
/*
export let volume = () => {
    return game.settings.get("monks-little-details", "volume") / 100.0;
};*/
export let combatposition = () => {
    return game.settings.get("monks-little-details", "combat-position");
};

export let patchFunc = (prop, func, type = "WRAPPER") => {
    if (game.modules.get("lib-wrapper")?.active) {
        libWrapper.register("monks-little-details", prop, func, type);
    } else {
        const oldFunc = eval(prop);
        eval(`${prop} = function (event) {
            return func.call(this, oldFunc.bind(this), ...arguments);
        }`);
    }
};

export class MonksLittleDetails {
    static tracker = false;
    static tokenHUDimages = {};
    static movingToken = false;
    static _setting = {};
    static markerCache = {};

    static canDo(setting) {
        //needs to not be on the reject list, and if there is an only list, it needs to be on it.
        if (
            MonksLittleDetails._rejectlist[setting] != undefined &&
            MonksLittleDetails._rejectlist[setting].includes(game.system.id)
        )
            return false;
        if (
            MonksLittleDetails._onlylist[setting] != undefined &&
            !MonksLittleDetails._onlylist[setting].includes(game.system.id)
        )
            return false;
        return true;
    }

    static init() {
        if (game.MonksLittleDetails == undefined) game.MonksLittleDetails = MonksLittleDetails;

        try {
            Object.defineProperty(User.prototype, "isTheGM", {
                get: function isTheGM() {
                    return (
                        this ==
                        (game.users.find((u) => u.hasRole("GAMEMASTER")) ||
                            game.users.find((u) => u.hasRole("ASSISTANT")))
                    );
                },
            });
        } catch {}

        MonksLittleDetails.SOCKET = "module.monks-little-details";

        MonksLittleDetails.READY = true;

        /*
        Object.defineProperty(Scene.prototype, "thumbnail", {
            get: function () {
                return this.getFlag('monks-little-details', 'thumb') || this.thumb;
            }
        });

        let oldUpdateObject = SceneConfig.prototype._updateObject;
        SceneConfig.prototype._updateObject = async function (event, formData) {
            let img = formData['flags.monks-little-details.thumbnail'];
            let td = (img ? await this.document.createThumbnail({ img: img }) : null);
            formData['flags.monks-little-details.thumb'] = td?.thumb;

            return oldUpdateObject.call(this, event, formData);
        }*/

        if (game.system.id == "dnd5e") MonksLittleDetails.xpchart = CONFIG.DND5E.CR_EXP_LEVELS;
        else if (game.system.id == "pf2e") {
            MonksLittleDetails.xpchart = [40, 60, 80, 120, 160];
        } else if (game.system.id == "pf1e") {
            MonksLittleDetails.xpchart = [
                50, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400, 9600, 12800, 19200, 25600, 38400, 51200, 76800,
                102400, 153600, 204800, 307200, 409600, 614400, 819200, 1228800, 1638400, 2457600, 3276800, 4915200,
                6553600, 9830400,
            ];
        }

        MonksLittleDetails.crChallenge = [
            {
                text: game.system.id == "pf2e" ? "MonksLittleDetails.trivial" : "MonksLittleDetails.easy",
                rating: "easy",
            },
            {
                text: game.system.id == "pf2e" ? "MonksLittleDetails.low" : "MonksLittleDetails.average",
                rating: "average",
            },
            {
                text: game.system.id == "pf2e" ? "MonksLittleDetails.moderate" : "MonksLittleDetails.challenging",
                rating: "challenging",
            },
            {
                text: game.system.id == "pf2e" ? "MonksLittleDetails.severe" : "MonksLittleDetails.hard",
                rating: "hard",
            },
            {
                text: game.system.id == "pf2e" ? "MonksLittleDetails.extreme" : "MonksLittleDetails.epic",
                rating: "epic",
            },
        ];

        MonksLittleDetails._rejectlist = {
            //"alter-hud": ["pf2e"]
        };
        MonksLittleDetails._onlylist = {
            "sort-by-columns": ["dnd5e"],
            "show-combat-cr": ["dnd5e", "pf2e"],
        };

        registerSettings();

        MonksLittleDetails.registerHotKeys();

        if (setting("reposition-collapse")) $("body").addClass("reposition-collapse");

        MonksLittleDetails.injectCSS();

        if (MonksLittleDetails.canDo("change-invisible-image") && setting("change-invisible-image"))
            CONFIG.controlIcons.visibility = "modules/monks-little-details/icons/invisible.svg";

        if (MonksLittleDetails.canDo("add-extra-statuses") && setting("add-extra-statuses")) {
            CONFIG.statusEffects = CONFIG.statusEffects.concat([
                {
                    id: "charmed",
                    label: "MonksLittleDetails.StatusCharmed",
                    icon: "modules/monks-little-details/icons/smitten.svg",
                },
                {
                    id: "exhausted",
                    label: "MonksLittleDetails.StatusExhausted",
                    icon: "modules/monks-little-details/icons/oppression.svg",
                },
                {
                    id: "grappled",
                    label: "MonksLittleDetails.StatusGrappled",
                    icon: "modules/monks-little-details/icons/grab.svg",
                },
                {
                    id: "incapacitated",
                    label: "MonksLittleDetails.StatusIncapacitated",
                    icon: "modules/monks-little-details/icons/internal-injury.svg",
                },
                {
                    id: "petrified",
                    label: "MonksLittleDetails.StatusPetrified",
                    icon: "modules/monks-little-details/icons/stone-pile.svg",
                },
                {
                    id: "hasted",
                    label: "MonksLittleDetails.StatusHasted",
                    icon: "modules/monks-little-details/icons/running-shoe.svg",
                },
                {
                    id: "slowed",
                    label: "MonksLittleDetails.StatusSlowed",
                    icon: "modules/monks-little-details/icons/turtle.svg",
                },
                {
                    id: "concentration",
                    label: "MonksLittleDetails.StatusConcentrating",
                    icon: "modules/monks-little-details/icons/beams-aura.svg",
                },
                {
                    id: "rage",
                    label: "MonksLittleDetails.StatusRage",
                    icon: "modules/monks-little-details/icons/enrage.svg",
                },
                {
                    id: "distracted",
                    label: "MonksLittleDetails.StatusDistracted",
                    icon: "modules/monks-little-details/icons/distraction.svg",
                },
                {
                    id: "dodging",
                    label: "MonksLittleDetails.StatusDodging",
                    icon: "modules/monks-little-details/icons/dodging.svg",
                },
                {
                    id: "disengage",
                    label: "MonksLittleDetails.StatusDisengage",
                    icon: "modules/monks-little-details/icons/journey.svg",
                },
                {
                    id: "cover",
                    label: "MonksLittleDetails.StatusCover",
                    icon: "modules/monks-little-details/icons/push.svg",
                },
                {
                    id: "turned",
                    label: "MonksLittleDetails.StatusTurned",
                    icon: "modules/monks-little-details/icons/turned.svg",
                },
            ]);
        }

        /*if (setting('context-view-artwork')) {
            let oldContextMenuOptions = Compendium.prototype._getContextMenuOptions;
            Compendium.prototype._contextMenu = function (html) {

                let compendium = this;
                new ContextMenu(html, ".directory-item", [
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

        CombatTurn.init();

        if (setting("alter-hud")) HUDChanges.init();

        CONFIG.ui.combat = WithMonksCombatTracker(CONFIG.ui.combat);

        if (setting("show-bloodsplat") != "false") BloodSplats.init();

        if (setting("add-combat-bars")) CombatBars.init();

        /*
        let tokenRefresh = function (wrapped, ...args) {
            wrapped.call(this);

            if (setting("show-bloodsplat") != "false")
                BloodSplats.tokenRefresh.call(this);
            if (setting('add-combat-bars'))
                CombatBars.tokenRefresh.call(this);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-little-details", "Token.prototype.refresh", tokenRefresh, "WRAPPER");
        } else {
            const oldTokenRefresh = Token.prototype.refresh;
            Token.prototype.refresh = function () {
                return tokenRefresh.call(this, oldTokenRefresh.bind(this), ...arguments);
            }
        }*/

        patchFunc("CombatTrackerConfig.prototype._updateObject", async (wrapped, ...args) => {
            let [event, formData] = args;
            game.settings.set("monks-little-details", "hide-defeated", formData.hideDefeated);
            $("#combat-popout").toggleClass("hide-defeated", formData.hideDefeated == true);
            return wrapped(...args);
        });

        let combatStart = async function (wrapped, ...args) {
            if (setting("prevent-initiative") && this.turns.find((c) => c.initiative == undefined) != undefined) {
                return await Dialog.confirm({
                    title: "Not all Initiative have been rolled",
                    content: `<p>There are combatants that havn't rolled their initiative.<br/>Do you wish to continue with starting the combat?</p>`,
                    yes: () => {
                        return wrapped.call(this);
                    },
                });
            } else return wrapped.call(this);
        };

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-little-details", "Combat.prototype.startCombat", combatStart, "MIXED");
        } else {
            const oldStartCombat = Combat.prototype.startCombat;
            Combat.prototype.startCombat = function () {
                return combatStart.call(this, oldStartCombat.bind(this), ...arguments);
            };
        }

        patchFunc("FilePicker.prototype._onSubmit", async (wrapped, ...args) => {
            let [ev] = args;
            let path = ev.target.file.value;

            if (path && path.length) {
                let idx = path.lastIndexOf("/");
                let target = path.substring(0, idx);

                let quicklinks = game.user.getFlag("monks-little-details", "quicklinks") || [];
                let link = quicklinks.find((q) => q.target == target);

                let favorites = [];
                let regular = quicklinks.filter((q) => {
                    if (q.favorite) favorites.push(q);
                    return !q.favorite;
                });

                // if this link already exists
                //      if a favorite then do nothing, not a favorite, then sort it to the top of the list
                // if this link doesn't exist
                // check to see if there are any non-favorite spots available and push to the list.  Pop any that are greater than 25

                if (link) {
                    if (!link.favorite) {
                        regular.findSplice((q) => q.target == target);
                        regular.unshift(link);
                    }
                } else {
                    if (favorites.length < 4) {
                        regular.unshift({ target: target, favorite: false });
                        if (regular.length + favorites.length > 4) regular = regular.slice(0, 4 - favorites.length);
                    }
                }

                quicklinks = favorites.concat(regular);
                game.user.setFlag("monks-little-details", "quicklinks", quicklinks);
            }

            return wrapped(...args);
        });

        if (setting("actor-sounds") && !game.modules.get("monks-sound-enhancements")?.active) ActorSounds.init();

        if (setting("token-combat-highlight")) CombatMarker.init();

        if (game.settings.get("monks-little-details", "prevent-token-removal")) {
            let oldToggleCombat = TokenHUD.prototype._onToggleCombat;
            TokenHUD.prototype._onToggleCombat = function (event) {
                if (this.object.inCombat) {
                    ui.notifications.warn(i18n("MonksLittleDetails.PreventTokenMessage"));
                    event.preventDefault();
                    return false;
                } else {
                    return oldToggleCombat.call(this, event);
                }
            };
        }

        if (game.settings.get("monks-little-details", "show-notify")) {
            let chatLogNotify = function (...args) {
                let message = args[0];
                this._lastMessageTime = new Date();
                if (!this.rendered) return;

                // Display the chat notification icon and remove it 3 seconds later
                let icon = $("#chat-notification");
                if (icon.is(":hidden")) icon.fadeIn(100);
                if (ui.sidebar.activeTab == "chat") {
                    setTimeout(() => {
                        if (new Date() - this._lastMessageTime > 3000 && icon.is(":visible")) icon.fadeOut(100);
                    }, 3001);
                }

                // Play a notification sound effect
                if (message.sound) AudioHelper.play({ src: message.sound });
            };

            if (game.modules.get("lib-wrapper")?.active) {
                libWrapper.register("monks-little-details", "ChatLog.prototype.notify", chatLogNotify, "OVERRIDE");
            } else {
                ChatLog.prototype.notify = function (event) {
                    return chatLogNotify.call(this, ...arguments);
                };
            }
        }

        let onDropData = async function (...args) {
            const [event, data] = args;
            if (!data.texture?.src) return;
            if (!this.active) this.activate();

            // Get the data for the tile to create
            const createData = await this._getDropData(event, data);

            // Validate that the drop position is in-bounds and snap to grid
            if (!canvas.dimensions.rect.contains(createData.x, createData.y)) return false;

            // Create the Tile Document
            const cls = getDocumentClass(this.constructor.documentName);
            return cls.create(createData, { parent: canvas.scene });
        };

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-little-details", "TilesLayer.prototype._onDropData", onDropData, "OVERRIDE");
        } else {
            //const oldOnDropData = MapLayer.prototype._onDropData;
            TilesLayer.prototype._onDropData = function () {
                return onDropData.call(this, ...arguments);
            };
        }

        /*
        let oldSync = AmbientSound.prototype.sync;
        AmbientSound.prototype.sync = function sync(isAudible, volume, options) {
            let result = oldSync.call(this, isAudible, volume, options);

            let delay = this.document.getFlag('monks-little-details', 'loop-delay');
            if (delay && delay != 0) {
                this.sound.loop = false;

                if (delay > 0) {
                    if (this.sound.loopdelay == null) {
                        $(this.sound).on('ended', function () {
                            this.sound.loopdelay = window.setTimeout(function () {
                                this.sound.play();
                            }, delay * 1000);
                        });
                    }
                }
            }

            return result;
        }*/

        let oldRenderPopout = ActorDirectory.prototype.renderPopout;
        ActorDirectory.prototype.renderPopout = function () {
            if (setting("open-actor")) {
                if (game.user.isGM) {
                    if (MonksLittleDetails._lastActor)
                        MonksLittleDetails._lastActor.sheet.render(true, { focus: true });
                    else return oldRenderPopout.call(this);
                } else {
                    if (game.user.character) game.user.character.sheet.render(true, { focus: true });
                    else return oldRenderPopout.call(this);
                }
            } else return oldRenderPopout.call(this);
        };
    }

    static async ready() {
        MonksLittleDetails._setting["token-highlight-animate"] = setting("token-highlight-animate");
        MonksLittleDetails._setting["token-combat-animation"] = setting("token-combat-animation");
        MonksLittleDetails._setting["token-combat-animation-hostile"] = setting("token-combat-animation-hostile");
        MonksLittleDetails._setting["token-highlight-scale"] = setting("token-highlight-scale");

        try {
            let actorId = game.user.getFlag("monks-little-details", "last-actor");
            if (actorId) MonksLittleDetails._lastActor = await fromUuid(actorId);
        } catch {}

        $("body").toggleClass("change-windows", setting("window-css-changes"));

        CombatTurn.ready();
        HUDChanges.ready();

        if (setting("actor-sounds") === "true") game.settings.set("monks-little-details", "actor-sounds", "npc");
        if (setting("actor-sounds") === "false") game.settings.set("monks-little-details", "actor-sounds", "none");

        if (
            !(setting("actor-sounds") === "none" || setting("actor-sounds") === "false") &&
            !game.modules.get("monks-sound-enhancements")?.active
        )
            ActorSounds.injectSoundCtrls();

        CombatTurn.checkCombatTurn(game.combats.active);

        game.socket.on(MonksLittleDetails.SOCKET, MonksLittleDetails.onMessage);

        //remove notify
        $('#sidebar-tabs a[data-tab="chat"]').on("click.monks-little-details", function (event) {
            let icon = $("#chat-notification");
            if (icon.is(":visible")) icon.fadeOut(100);
        });
    }

    static registerHotKeys() {
        game.keybindings.register("monks-little-details", "movement-key", {
            name: "MonksLittleDetails.movement-key.name",
            hint: "MonksLittleDetails.movement-key.hint",
            editable: [{ key: "KeyM" }],
            restricted: true,
        });

        if (game.settings.get("monks-little-details", "key-swap-tool")) {
            let layers = [
                { name: "Token Layer", tool: "token", def: "KeyG", restricted: false },
                { name: "Measure Layer", tool: "measure", restricted: false },
                { name: "Tile Layer", tool: "tiles", def: "KeyH", restricted: true },
                { name: "Drawing Layer", tool: "drawings", restricted: false },
                { name: "Wall Layer", tool: "walls", restricted: true },
                { name: "Lighting Layer", tool: "lighting", def: "KeyJ", restricted: true },
                { name: "Sound Layer", tool: "sounds", def: "KeyK", restricted: true },
                { name: "Note Layer", tool: "notes", restricted: false },
            ];
            if (game.modules["enhanced-terrain-layer"]?.active)
                layers.push({
                    name: i18n("MonksLittleDetails.TerrainLayer"),
                    tool: "terrain",
                    def: "KeyL",
                    restricted: true,
                });

            layers.map((l) => {
                game.keybindings.register("monks-little-details", `swap-${l.tool}-control`, {
                    name: `Quick show ${l.name}`,
                    editable: l.def ? [{ key: l.def }] : [],
                    restricted: l.restricted,
                    onDown: () => {
                        MonksLittleDetails.swapTool(l.tool, true);
                    },
                    onUp: () => {
                        MonksLittleDetails.releaseTool();
                    },
                });
                game.keybindings.register("monks-little-details", `change-${l.tool}-control`, {
                    name: `Change to ${l.name}`,
                    editable: l.def ? [{ key: l.def, modifiers: [KeyboardManager.MODIFIER_KEYS?.SHIFT] }] : [],
                    restricted: l.restricted,
                    onDown: () => {
                        MonksLittleDetails.swapTool(l.tool, false);
                    },
                });
            });
        }
    }

    static swapTool(controlName, quick = true) {
        let control = ui.controls.control;
        if (control.name != controlName && MonksLittleDetails.switchTool == undefined) {
            if (quick !== false)
                //e?.shiftKey
                MonksLittleDetails.switchTool = { control: control, tool: control.activeTool };
            let newcontrol = ui.controls.controls.find((c) => {
                return c.name == controlName;
            });
            if (newcontrol != undefined) {
                //ui.controls.activeControl = newcontrol.name;
                if (newcontrol && newcontrol.layer) canvas[newcontrol.layer].activate();
            }
        }
    }

    static releaseTool() {
        if (MonksLittleDetails.switchTool != undefined) {
            if (MonksLittleDetails.switchTool.control) {
                if (MonksLittleDetails.switchTool.control.layer)
                    canvas[MonksLittleDetails.switchTool.control.layer].activate();
                //ui.controls.activeControl = MonksLittleDetails.switchTool.control.name;
            }
            delete MonksLittleDetails.switchTool;
        }
    }

    static injectCSS() {
        let innerHTML = "";
        let style = document.createElement("style");
        style.id = "monks-css-changes";
        if (setting("core-css-changes")) {
            innerHTML += `
.directory .directory-list .directory-item img {
    object-fit: contain !important;
    object-position: center !important;
}

.filepicker .thumbs-list img {
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

.form-group select{
    width: calc(100% - 2px);
}

.compendium.directory .directory-list .directory-item.scene {
    position: relative;
    height: calc(var(--sidebar-item-height) + 2px);
}

.compendium.directory .directory-list .directory-item.scene img {
    flex: 1;
    object-fit: cover !important;
}

.compendium.directory .directory-list .directory-item.scene h4 {
    position: absolute;
    width: 100%;
    text-align: center;
    text-shadow: 1px 1px 3px #000;
    color: #f0f0e0;
    margin: 0px;
}

.compendium.directory .directory-list .directory-item.scene h4 a{
background-color: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 4px;
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

        if (setting("move-pause")) {
            innerHTML += `
#pause{
    bottom:30%;
}
`;
        }

        //let iconWidth = '24';
        //if (game.system.id == 'pf2e' || (game.modules.get("illandril-token-hud-scale") != undefined && game.modules.get("illandril-token-hud-scale").active && game.settings.get("illandril-token-hud-scale", "enableStatusSelectorScale")))
        //    iconWidth = '36';

        style.innerHTML = innerHTML;
        if (innerHTML != "") document.querySelector("head").appendChild(style);
    }

    static getMoveKey() {
        let keys = game.keybindings.bindings.get("monks-little-details.movement-key");
        if (!keys || keys.length == 0) return;

        return keys[0].key;
    }

    static async moveTokens(event) {
        let moveKey = MonksLittleDetails.getMoveKey();

        if (game.user.isGM && moveKey && game.keyboard.downKeys.has(moveKey) && canvas.tokens.controlled.length > 0) {
            let pos = event.data.getLocalPosition(canvas.app.stage);
            let mid = {
                x: canvas.tokens.controlled[0].x,
                y: canvas.tokens.controlled[0].y,
            };
            for (let i = 1; i < canvas.tokens.controlled.length; i++) {
                mid.x += canvas.tokens.controlled[i].x;
                mid.y += canvas.tokens.controlled[i].y;
            }
            mid.x = mid.x / canvas.tokens.controlled.length;
            mid.y = mid.y / canvas.tokens.controlled.length;

            let tokens = canvas.tokens.controlled.map((t) => {
                return t.id;
            });
            let updates = [];
            for (let i = 0; i < tokens.length; i++) {
                let t = canvas.tokens.get(tokens[i]);
                let offsetx = mid.x - t.x;
                let offsety = mid.y - t.y;
                let gridPt = canvas.grid.grid.getGridPositionFromPixels(pos.x - offsetx, pos.y - offsety);
                let px = canvas.grid.grid.getPixelsFromGridPosition(gridPt[0], gridPt[1]);

                //t.update({ x: px[0], y: px[1] }, { animate: false });
                updates.push({ _id: t.id, x: px[0], y: px[1] });
            }
            if (updates.length) {
                MonksLittleDetails.movingToken = true;
                await canvas.scene.updateEmbeddedDocuments("Token", updates, { animate: false, bypass: true });
                MonksLittleDetails.movingToken = false;
            }
        }
    }

    static repositionCombat(app) {
        //we want to start the dialog in a different corner
        let sidebar = document.getElementById("ui-right");
        let players = document.getElementById("players");

        app.position.left = combatposition().endsWith("left") ? 120 : sidebar.offsetLeft - app.position.width;
        app.position.top = combatposition().startsWith("top")
            ? combatposition().endsWith("left")
                ? 70
                : sidebar.offsetTop - 3
            : combatposition().endsWith("left")
            ? players.offsetTop - app.position.height - 3
            : sidebar.offsetTop + sidebar.offsetHeight - app.position.height - 3;

        $(app._element).css({ top: app.position.top, left: app.position.left });
    }

    static getCRText(cr) {
        switch (cr) {
            case 0.13:
                return "⅛";
            case 0.17:
                return "⅙";
            case 0:
            case 0.25:
                return "¼";
            case 0.33:
                return "⅓";
            case 0.5:
                return "½";
            default:
                return cr;
        }
    }

    static getCR(combat) {
        var apl = { count: 0, levels: 0 };
        var xp = 0;

        if (game.system.id == "pf2e") {
            // first, filter down to combatants with actor and token
            let combatants = combat.combatants.filter(
                (combatant) => combatant.actor != undefined && combatant.token != undefined
            );
            // then identify party members by token.disposition == 1
            let party = combatants
                .filter((combatant) => combatant.token.disposition == 1)
                .map((hero) => hero?.actor.system.details?.level?.value ?? 0);
            // compute average party level, rounded
            let party_level = Math.round(party.reduce((sum, level) => (sum += level), 0) / party.length) || 0;
            // identify non-hazard enemies and find their level
            let enemies = combatants
                .filter((combatant) => combatant.token.disposition != 1 && combatant.actor.type != "hazard")
                .map((enemy) => enemy?.actor.system.details?.level?.value ?? 0);
            // identify hazards, find their level, and identify if complex
            let hazards = combatants
                .filter((combatant) => combatant.token.disposition != 1 && combatant.actor.type == "hazard")
                .map((hazard) => {
                    return {
                        level: hazard?.actor.system.details?.level?.value ?? 0,
                        isComplex: hazard?.actor.system.details?.isComplex,
                    };
                });
            // poll pf2e system for xp
            let reward = game.pf2e.gm.calculateXP(party_level, party.length, enemies, hazards, {});
            // return cr index and xp per player
            return {
                cr: ["trivial", "low", "moderate", "severe", "extreme"].indexOf(reward.rating),
                xp: reward.xpPerPlayer,
            };
        } else {
            //get the APL of friendly combatants
            for (let combatant of combat.combatants) {
                if (combatant.actor != undefined && combatant.token != undefined) {
                    if (combatant.token.disposition == 1) {
                        apl.count = apl.count + 1;
                        let levels = 0;
                        if (combatant.actor.system?.classes) {
                            levels = Object.values(combatant.actor.system?.classes).reduce((a, b) => {
                                return a + (b?.levels || b?.level || 0);
                            }, 0);
                        } else {
                            levels =
                                combatant?.actor.system.details?.level?.value ||
                                combatant?.actor.system.details?.level ||
                                0;
                        }

                        apl.levels += levels;
                    } else {
                        let combatantxp = combatant?.actor.system.details?.xp?.value;
                        if (combatantxp == undefined) {
                            let levels = 0;
                            if (
                                combatant?.actor.system?.classes &&
                                Object.entities(combatant.actor.system?.classes).length
                            )
                                levels = combatant.actor.system?.classes?.reduce((c) => {
                                    return c.levels;
                                });
                            else if (combatant?.actor.system.details?.level?.value)
                                levels = parseInt(combatant?.actor.system.details?.level?.value);
                            combatantxp =
                                MonksLittleDetails.xpchart[
                                    Math.clamped(levels, 0, MonksLittleDetails.xpchart.length - 1)
                                ];
                        }
                        xp += combatantxp || 0;
                    }
                }
            }

            var calcAPL = 0;
            if (apl.count > 0)
                calcAPL = Math.round(apl.levels / apl.count) + (apl.count < 4 ? -1 : apl.count > 5 ? 1 : 0);

            //get the CR of any unfriendly/neutral
            let cr = Math.clamped(
                MonksLittleDetails.xpchart.findIndex((cr) => cr > xp) - 1,
                0,
                MonksLittleDetails.xpchart.length - 1
            );

            return { cr: cr, apl: calcAPL };
        }
    }

    static getDiceSound(hasMaestroSound = false) {
        const has3DDiceSound = game.dice3d ? game.settings.get("dice-so-nice", "settings").enabled : false;
        const playRollSounds = true; //game.settings.get("betterrolls5e", "playRollSounds")

        if (playRollSounds && !has3DDiceSound && !hasMaestroSound) {
            return CONFIG.sounds.dice;
        }

        return null;
    }

    static rgbToHex(r, g, b) {
        var componentToHex = function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        };
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
            if (typeof a === "undefined" || a >= 125) {
                if (!(r > 250 && g > 250 && b > 250)) {
                    pixelArray.push([r, g, b]);
                }
            }
        }
        return pixelArray;
    }

    static getPalette(src, element) {
        // Create custom CanvasImage object
        if (src != undefined) {
            loadTexture(src).then((texture) => {
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
                    canvas.app.renderer.render(sprite, tex);
                    let pixels = canvas.app.renderer.extract.pixels(tex);
                    tex.destroy(true);

                    const pixelCount = texture.width * texture.height;

                    const pixelArray = MonksLittleDetails.createPixelArray(pixels, pixelCount, 10);

                    sprite.destroy();

                    // Send array to quantize function which clusters values
                    // using median cut algorithm
                    const cmap = MMCQ.quantize(pixelArray, 5);
                    const palette = cmap ? cmap.palette() : null;

                    $(element).empty();
                    for (let i = 0; i < palette.length; i++) {
                        var hexCode = MonksLittleDetails.rgbToHex(palette[i][0], palette[i][1], palette[i][2]);
                        $(element).append(
                            $("<div>")
                                .addClass("background-palette")
                                .attr("title", hexCode)
                                .css({ backgroundColor: hexCode })
                                .on(
                                    "click",
                                    $.proxy(MonksLittleDetails.updateSceneBackground, MonksLittleDetails, hexCode)
                                )
                        );
                    }
                }
            });
        }
    }

    static async updateSceneBackground(hexCode) {
        $(".background-palette-container").remove();
        await MonksLittleDetails.currentScene.update({ backgroundColor: hexCode });
    }

    static checkPopout(combat, delta) {
        let combatStarted =
            combat && combat.started === true && ((delta.round === 1 && combat.turn === 0) || delta.bypass);

        //log("update combat", combat);
        let opencombat = setting("opencombat");

        //popout combat (if gm and opencombat is everyone or gm only), (if player and opencombat is everyone or players only and popout-combat)
        if (
            ((game.user.isGM && ["everyone", "gmonly"].includes(opencombat)) ||
                (!game.user.isGM &&
                    ["everyone", "playersonly"].includes(opencombat) &&
                    game.settings.get("monks-little-details", "popout-combat"))) &&
            combatStarted
        ) {
            //new combat, pop it out
            const tabApp = ui["combat"];
            tabApp.renderPopout(tabApp);

            if (ui.sidebar.activeTab !== "chat") ui.sidebar.activateTab("chat");
        }

        if (combatposition() !== "" && delta.active === true) {
            //+++ make sure if it's not this players turn and it's not the GM to add padding for the button at the bottom
            MonksLittleDetails.tracker = false; //delete this so that the next render will reposition the popout, changing between combats changes the height
        }
    }

    static emit(action, args = {}) {
        args.action = action;
        args.senderId = game.user.id;
        game.socket.emit(MonksLittleDetails.SOCKET, args, (resp) => {});
    }

    static onMessage(data) {
        MonksLittleDetails[data.action].call(MonksLittleDetails, data);
    }

    static async showShadows(data) {
        fromUuid(data.uuid).then((token) => {
            if (token && (token.isOwner || game.user.isGM)) {
                CombatTurn.showShadow(token.object, data.x, data.y);
            }
        });
    }

    static async removeShadow(data) {
        CombatTurn.removeShadow(data.id);
    }

    static async spellChange(data) {
        if (game.user.isTheGM) {
            let whisper = ChatMessage.getWhisperRecipients("GM");
            let player = game.users.find((u) => u.id == data.user);
            let actor = game.actors.find((a) => a.id == data.actor);
            ChatMessage.create({
                user: game.user,
                content: `<i>${player?.name}</i> has changed prepared spells (${data.name}) for <b>${actor?.name}</b> while token is in combat.`,
                whisper: whisper,
            });
        }
    }

    static isDefeated(token) {
        return (
            (token && token.combatant && token.combatant.defeated) ||
            token.actor?.effects.find((e) => e.getFlag("core", "statusId") === CONFIG.specialStatusEffects.DEFEATED) ||
            token.document.overlayEffect == CONFIG.controlIcons.defeated
        );
    }

    static showUpdateImages() {
        new UpdateImages().render(true);
    }

    static async fixImages({
        wildcards = true,
        packs = "dnd5e.monsters",
        system = "dnd",
        tokentypes = ["overhead", "disc", "artwork"],
    } = {}) {
        let getFiles = async function (filename) {
            let source = "data";
            let pattern = filename;
            const browseOptions = { wildcard: wildcards };

            if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
                source = "forgevtt";
            }

            // Support S3 matching
            if (/\.s3\./.test(pattern)) {
                source = "s3";
                const { bucket, keyPrefix } = FilePicker.parseS3URL(pattern);
                if (bucket) {
                    browseOptions.bucket = bucket;
                    pattern = keyPrefix;
                }
            }

            // Retrieve wildcard content
            try {
                const content = await FilePicker.browse(source, pattern, browseOptions);
                return content.files;
            } catch (err) {
                error(err);
                return null;
            }
            return [];
        };

        let alltypes = [];

        packs = packs instanceof Array ? packs : [packs];

        for (let pack of packs) {
            var monsters = game.packs.get(pack);
            if (monsters) {
                await monsters.configure({ locked: false });

                await monsters.getDocuments().then(async (entries) => {
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var monname = entry.name.toLowerCase();
                        monname = monname
                            .replace(/-/g, "")
                            .replace(/'/g, "")
                            .replace(/\(.*\)/, "")
                            .replace(/\s/g, "");
                        /*if (monname == 'ettin')
                            log('Ettin');
                        var mtype = entry.system.details.type?.value.toLowerCase() || entry.system.traits.traits.value; //|| entry.system.details.creatureType?.toLowerCase()
                        mtype = (mtype instanceof Array ? mtype : [mtype]);
                        for (let i = 0; i < mtype.length; i++) {
                            if (mtype[i].indexOf(',') > 0) {
                                let temp = mtype[i].split(',');
                                mtype[i] = temp[0];
                                for (let j = 1; j < temp.length; j++)
                                    mtype.push(temp[j]);
                            }
                            mtype[i] = mtype[i].replace(/\(.*\)/, '').replace(/\s/g, '');
                        }
                        //mtype = mtype.replace(/\(.*\)/, '').replace(/\s/g, '').split(',');

                        for (let montype of mtype) {*/
                        //if (!alltypes.find(t => t == montype))
                        //    alltypes.push(montype);

                        var imgname = `images/avatar/${system}/${monname}.png`;
                        if (entry.img.toLowerCase() != imgname) {
                            let files = await getFiles(imgname);
                            if (files && files.length > 0) {
                                await entry.update({ img: files[0] });
                                log("Fixing:", entry.name, files[0]);
                            } else {
                                if (monname.startsWith("ancient")) monname = monname.replace("ancient", "");
                                if (monname.startsWith("adult")) monname = monname.replace("adult", "");
                                if (monname.startsWith("young")) monname = monname.replace("young", "");

                                imgname = `images/avatar/${system}/${monname}.png`;
                                if (entry.img.toLowerCase() != imgname) {
                                    let files = await getFiles(imgname);
                                    if (files && files.length > 0) {
                                        await entry.update({ img: files[0] });
                                        log("Fixing:", entry.name, files[0]);
                                    } //else {
                                    //log('Cant find:' + monname + ', ' + montype);
                                    //}
                                }
                            }
                        }
                        /*
                            for (let tokentype of tokentypes) {
                                var tokenname = `images/tokens/${tokentype}/${montype}/${monname}.png`; // + (wildcards ? "*" : '')
                                if (entry.token.img == tokenname)
                                    break;

                                let files = await getFiles(tokenname);
                                if (files && files.length > 0) {
                                    await entry.update({ token: { img: files[0] } });
                                    log('Fixing Token:', entry.name, files[0]);
                                    break;
                                }
                            }*/
                    }
                    //}

                    monsters.configure({ locked: true });
                    log("Completed: " + monsters.title);
                });
            }
        }

        log("All monster types:" + alltypes);
    }
}

Hooks.once("init", async function () {
    MonksLittleDetails.init();
});

Hooks.on("createCombat", function (data, delta) {
    //when combat is created, switch to combat tab
    if (game.user.isGM && setting("switch-combat-tab") && ui.sidebar.activeTab !== "combat")
        ui.sidebar.activateTab("combat");
});

Hooks.on("deleteCombat", function (combat) {
    MonksLittleDetails.tracker = false; //if the combat gets deleted, make sure to clear this out so that the next time the combat popout gets rendered it repositions the dialog

    //if there are no more combats left, then close the combat window
    if (game.combats.combats.length == 0 && game.settings.get("monks-little-details", "close-combat-when-done")) {
        const tabApp = ui["combat"];
        if (tabApp._popout != undefined) {
            MonksLittleDetails.closeCount = 0;
            MonksLittleDetails.closeTimer = setInterval(function () {
                MonksLittleDetails.closeCount++;
                const tabApp = ui["combat"];
                if (MonksLittleDetails.closeCount > 100 || tabApp._popout == undefined) {
                    clearInterval(MonksLittleDetails.closeTimer);
                    return;
                }

                const states = tabApp?._popout.constructor.RENDER_STATES;
                if (![states.CLOSING, states.RENDERING].includes(tabApp?._popout._state)) {
                    tabApp?._popout.close();
                    clearInterval(MonksLittleDetails.closeTimer);
                }
            }, 100);
        }
    }
});

Hooks.on("updateCombat", async function (combat, delta) {
    MonksLittleDetails.checkPopout(combat, delta);
    /*
    let combatStarted = (combat && (delta.round === 1 && combat.turn === 0 && combat.started === true));

    //log("update combat", combat);
    let opencombat = setting("opencombat");

    //popout combat (if gm and opencombat is everyone or gm only), (if player and opencombat is everyone or players only and popout-combat)
    if (((game.user.isGM && ['everyone', 'gmonly'].includes(opencombat)) ||
        (!game.user.isGM && ['everyone', 'playersonly'].includes(opencombat) && game.settings.get("monks-little-details", "popout-combat")))
        && combatStarted) {
		//new combat, pop it out
		const tabApp = ui["combat"];
		tabApp.renderPopout(tabApp);
		
        if (ui.sidebar.activeTab !== "chat")
            ui.sidebar.activateTab("chat");
    }

    if (combatposition() !== '' && delta.active === true) {
        //+++ make sure if it's not this players turn and it's not the GM to add padding for the button at the bottom
        MonksLittleDetails.tracker = false;   //delete this so that the next render will reposition the popout, changing between combats changes the height
    }*/
});

Hooks.on("createCombatant", async function (combatant, delta, userId) {
    MonksLittleDetails.checkPopout(combatant.combat, { active: true, bypass: true });
});

Hooks.on("ready", MonksLittleDetails.ready);

Hooks.on("canvasReady", () => {
    canvas.stage.on("mousedown", MonksLittleDetails.moveTokens); //move all tokens while holding down m
});

Hooks.on("closeCombatTracker", async (app, html) => {
    MonksLittleDetails.tracker = false;
});

Hooks.on("renderTokenHUD", async (app, html, options) => {
    MonksLittleDetails.element = html;
    //MonksLittleDetails.tokenHUD = app;

    //swap the setting and target button
    if (game.settings.get("monks-little-details", "swap-buttons")) {
        $('.col.left .control-icon[data-action="target"]', html).insertBefore(
            $('.col.left .control-icon[data-action="config"]', html)
        );
    }
});

Hooks.on("renderCombatTracker", async (app, html, data) => {
    if (!MonksLittleDetails.tracker && app.options.id == "combat" && app.options.popOut) {
        MonksLittleDetails.tracker = true;

        if (combatposition() !== "") {
            MonksLittleDetails.repositionCombat(app);
        }
    }

    if (
        !app.popOut &&
        game.user.isGM &&
        data.combat &&
        !data.combat.started &&
        setting("show-combat-cr") &&
        MonksLittleDetails.xpchart != undefined
    ) {
        //calculate CR
        let crdata = MonksLittleDetails.getCR(data.combat);

        if ($("#combat-round .encounter-cr-row").length == 0 && data.combat.combatants.size > 0) {
            let crChallenge = "";
            let epicness = "";
            let crText = "";
            if (game.system.id == "pf2e") {
                crChallenge =
                    MonksLittleDetails.crChallenge[
                        Math.clamped(crdata.cr, 0, MonksLittleDetails.crChallenge.length - 1)
                    ];
                crText = "XP: " + crdata.xp;
            } else {
                crChallenge = MonksLittleDetails.crChallenge[Math.clamped(crdata.cr - crdata.apl, -1, 3) + 1];
                epicness = Math.clamped(crdata.cr - crdata.apl - 3, 0, 5);
                crText = "CR: " + MonksLittleDetails.getCRText(crdata.cr);
            }

            $("<nav>")
                .addClass("encounters flexrow encounter-cr-row")
                .append($("<h4>").html(crText))
                .append(
                    $("<div>")
                        .addClass("encounter-cr")
                        .attr("rating", crChallenge.rating)
                        .html(i18n(crChallenge.text) + "!".repeat(epicness))
                )
                .insertAfter($("#combat .encounter-controls"));
        }
    }

    //don't show the previous or next turn if this isn't the GM
    if (!game.user.isGM && data.combat && data.combat.started) {
        $('.combat-control[data-control="previousTurn"],.combat-control[data-control="nextTurn"]:last').css({
            visibility: "hidden",
        });
    }

    if (app.options.popOut) {
        $(app.element).toggleClass("hide-defeated", setting("hide-defeated") == true);
    }
});

Hooks.on("renderSceneConfig", async (app, html, options) => {
    if (game.settings.get("monks-little-details", "scene-palette")) {
        MonksLittleDetails.currentScene = app.object;

        let backgroundColor = $('input[data-edit="backgroundColor"]', html);
        backgroundColor.parents(".form-group:first").css({ position: "relative" });
        $("<button>")
            .attr("type", "button")
            .html('<i class="fas fa-palette"></i>')
            .on("click", function (e) {
                let element = $(this).siblings(".background-palette-container");
                if (element.length == 0) {
                    element = $("<div>").addClass("background-palette-container flexrow").insertAfter(this);
                    MonksLittleDetails.getPalette(MonksLittleDetails.currentScene.background.src, element);
                } else {
                    element.remove();
                }
                e.preventDefault();
            })
            .insertAfter(backgroundColor);
    }

    /*
    $('<div>')
        .addClass('form-group')
        .append($('<label>').html('Thumbnail Image'))
        .append(
            $('<div>').addClass('form-fields')
                .append($('<button>')
                    .addClass('file-picker')
                    .attr({ type: 'button', 'data-type': 'imagevideo', 'data-target': 'flags.monks-little-details.thumbnail', title: 'Browse Files', tabindex: '-1' })
                    .html('<i class="fas fa-file-import fa-fw"></i>')
                    .click(app._activateFilePicker.bind(app))
                )
                .append($('<input>').addClass('image').attr({ type: 'text', name: 'flags.monks-little-details.thumbnail', placeholder: 'File Path' }).val(app.object.getFlag('monks-little-details', 'thumbnail')))
        )
        .append($('<p>').addClass('notes').html(`Configure the thumbnail image that's shown in the scenes directory`))
        .insertAfter($('input[name="foreground"]', html).closest('.form-group'));
        */
    app.setPosition({ height: "auto" });
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
    let btn = $("<button>")
        .addClass("file-picker")
        .attr("type", "button")
        .attr("data-type", "imagevideo")
        .attr("data-target", "img")
        .attr("title", "Browse Files")
        .attr("tabindex", "-1")
        .html('<i class="fas fa-file-import fa-fw"></i>')
        .click(function (event) {
            const fp = new FilePicker({
                type: "audio",
                wildcard: true,
                current: $(event.currentTarget).prev().val(),
                callback: (path) => {
                    $(event.currentTarget).prev().val(path);
                },
            });
            return fp.browse();
        });

    let parent = $('input[name="monks-little-details.next-sound"]', html).closest(".form-group");
    $('input[name="monks-little-details.next-sound"]', html)
        .css({ "flex-basis": "unset", "flex-grow": 1 })
        .insertAfter($('input[name="monks-little-details.play-next-sound"]', html));
    parent.remove();

    btn.clone(true).insertAfter($('input[name="monks-little-details.next-sound"]', html));

    parent = $('input[name="monks-little-details.turn-sound"]', html).closest(".form-group");
    $('input[name="monks-little-details.turn-sound"]', html)
        .css({ "flex-basis": "unset", "flex-grow": 1 })
        .insertAfter($('input[name="monks-little-details.play-turn-sound"]', html));
    parent.remove();

    btn.clone(true).insertAfter($('input[name="monks-little-details.turn-sound"]', html));

    parent = $('input[name="monks-little-details.round-sound"]', html).closest(".form-group");
    $('input[name="monks-little-details.round-sound"]', html)
        .css({ "flex-basis": "unset", "flex-grow": 1 })
        .insertAfter($('input[name="monks-little-details.play-round-sound"]', html));
    parent.remove();

    btn.clone(true).insertAfter($('input[name="monks-little-details.round-sound"]', html));

    //only show popout-combat if it's a player and it's available
    let opencombat = setting("opencombat");
    $('input[name="monks-little-details.popout-combat"]', html)
        .closest(".form-group")
        .toggle(!game.user.isGM && ["everyone", "playeronly"].includes(opencombat));

    let btn2 = $("<button>")
        .addClass("file-picker")
        .attr("type", "button")
        .attr("data-type", "imagevideo")
        .attr("data-target", "img")
        .attr("title", "Browse Files")
        .attr("tabindex", "-1")
        .html('<i class="fas fa-file-import fa-fw"></i>')
        .click(function (event) {
            const fp = new FilePicker({
                type: "imagevideo",
                current: $(event.currentTarget).prev().val(),
                callback: (path) => {
                    $(event.currentTarget).prev().val(path);
                },
            });
            return fp.browse();
        });

    btn2.clone(true).insertAfter(
        $('input[name="monks-little-details.token-highlight-picture"]', html).css({
            "flex-basis": "unset",
            "flex-grow": 1,
        })
    );
    btn2.clone(true).insertAfter(
        $('input[name="monks-little-details.token-highlight-picture-hostile"]', html).css({
            "flex-basis": "unset",
            "flex-grow": 1,
        })
    );
    btn2.clone(true).insertAfter(
        $('input[name="monks-little-details.treasure-chest"]', html).css({ "flex-basis": "unset", "flex-grow": 1 })
    );

    let colour = setting("bloodsplat-colour");
    $("<input>")
        .attr("type", "color")
        .attr("data-edit", "monks-little-details.bloodsplat-colour")
        .val(colour)
        .insertAfter($('input[name="monks-little-details.bloodsplat-colour"]', html).addClass("color"));

    $("<div>")
        .addClass("form-group group-header")
        .html(i18n("MonksLittleDetails.SystemChanges"))
        .insertBefore($('[name="monks-little-details.swap-buttons"]').parents("div.form-group:first"));
    $("<div>")
        .addClass("form-group group-header")
        .html(i18n("MonksLittleDetails.CombatTracker"))
        .insertBefore($('[name="monks-little-details.show-combat-cr"]').parents("div.form-group:first"));
    $("<div>")
        .addClass("form-group group-header")
        .html(i18n("MonksLittleDetails.CombatTurn"))
        .insertBefore($('[name="monks-little-details.shownextup"]').parents("div.form-group:first"));
    $("<div>")
        .addClass("form-group group-header")
        .html(i18n("MonksLittleDetails.CombatTokenHighlight"))
        .insertBefore($('[name="monks-little-details.token-combat-highlight"]').parents("div.form-group:first"));
    $("<div>")
        .addClass("form-group group-header")
        .html(i18n("MonksLittleDetails.AddedFeatures"))
        .insertBefore($('[name="monks-little-details.scene-palette"]').parents("div.form-group:first"));
});

Hooks.on("updateToken", async function (document, data, options, userid) {
    let hp = getProperty(data, "actorData.system.attributes.hp.value");
    let token = document.object;

    if (setting("auto-defeated") != "none" && game.user.isGM) {
        if (hp != undefined && (setting("auto-defeated").startsWith("all") || document.disposition != 1)) {
            let combatant = document.combatant;

            //check to see if the combatant has been defeated
            let defeated = setting("auto-defeated").endsWith("negative") ? hp < 0 : hp == 0;
            if (combatant != undefined && combatant.defeated != defeated) {
                await combatant.update({ defeated: defeated });
            }

            if (defeated && setting("invisible-dead")) {
                await document.update({ hidden: true });
            }
        }
    }

    if (hp != undefined) {
        token.refresh();
    }

    if (setting("auto-reveal") && game.user.isGM && data.hidden === false) {
        let combatant = document.combatant;

        if (combatant?.hidden === true) {
            await combatant.update({ hidden: false }).then(() => {
                token.refresh();
            });
        }
    }

    CombatBars.updateToken(document, data);
});

Hooks.on("updateCombatant", async function (combatant, data, options, userId) {
    const combat = combatant.parent;
    if (
        combat &&
        combat.started &&
        data.defeated != undefined &&
        setting("auto-defeated") != "none" &&
        game.user.isGM
    ) {
        let t = combatant.token;
        const a = combatant.token.actor;

        let status = CONFIG.statusEffects.find((e) => e.id === CONFIG.specialStatusEffects.DEFEATED);
        let effect = a && status ? status : CONFIG.controlIcons.defeated;
        const exists =
            effect.icon == undefined
                ? t.overlayEffect == effect
                : a.effects.find((e) => e.getFlag("core", "statusId") === effect.id) != undefined;
        if (exists != data.defeated) {
            await t.object.toggleEffect(effect, { overlay: true, active: data.defeated });
            t.object.refresh();
        }
    }
});

Hooks.on("renderCompendium", (compendium, html, data) => {
    if (setting("compendium-view-artwork")) {
        if (compendium.collection.documentName == "Scene") {
            html.find("li.directory-item h4 a").click((ev) => {
                ev.preventDefault();
                ev.cancelBubble = true;
                if (ev.stopPropagation) ev.stopPropagation();

                let documentId = ev.currentTarget.closest("li").dataset.documentId;
                compendium.collection.getDocument(documentId).then((entry) => {
                    let img = entry.background.src;
                    if (VideoHelper.hasVideoExtension(img))
                        ImageHelper.createThumbnail(img, { width: entry.width, height: entry.height }).then((img) => {
                            new ImagePopout(img.thumb, {
                                title: entry.name,
                                shareable: true,
                                uuid: entry.uuid,
                            }).render(true);
                        });
                    else {
                        new ImagePopout(img, {
                            title: entry.name,
                            shareable: true,
                            uuid: entry.uuid,
                        }).render(true);
                    }
                });
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
                                let audio = AudioHelper.play({ src: sound.path });
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

    if (
        (update.x != undefined || update.y != undefined) &&
        game.user.isGM &&
        moveKey &&
        game.keyboard.downKeys.has(moveKey)
    ) {
        options.animate = false;
        options.bypass = true;
    }
});

Hooks.once("libChangelogsReady", function () {});

Hooks.on("getSceneControlButtons", (controls) => {
    if (setting("find-my-token")) {
        let tokenControls = controls.find((control) => control.name === "token");
        tokenControls.tools.push({
            name: "findtoken",
            title: "MonksLittleDetails.FindMyToken",
            icon: "fas fa-users-viewfinder",
            onClick: async (away) => {
                //Find token
                let tokens = canvas.tokens.ownedTokens;
                if (tokens.length == 0) return;

                let lastTime = game.user.getFlag("monks-little-details", "findTime");
                let lastIdx =
                    lastTime == undefined || Date.now() - lastTime > 2000
                        ? 0
                        : game.user.getFlag("monks-little-details", "findIdx") || 0;

                if (lastIdx >= tokens.length) lastIdx = 0;

                let token = tokens[lastIdx];
                if (!token) return;

                canvas.pan({ x: token.x, y: token.y });
                token.control({ releaseOthers: true });

                lastIdx = (lastIdx + 1) % tokens.length;
                await game.user.setFlag("monks-little-details", "findTime", Date.now());
                await game.user.setFlag("monks-little-details", "findIdx", lastIdx);
            },
            button: true,
        });
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

Hooks.on("renderActorSheet", (sheet) => {
    MonksLittleDetails._lastActor = sheet.object;
    game.user.setFlag("monks-little-details", "last-actor", sheet.object.uuid);
});

Hooks.on("getSidebarDirectoryFolderContext", (html, entries) => {
    entries.push({
        name: "FOLDER.Clear",
        icon: '<i class="fas fa-folder"></i>',
        condition: game.user.isGM,
        callback: (header) => {
            const li = header.parent();
            const folder = game.folders.get(li.data("folderId"));
            if (folder) {
                return Dialog.confirm({
                    title: `${i18n("FOLDER.Clear")} ${folder.name}`,
                    content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${i18n(
                        "MonksLittleDetails.ClearWarning"
                    )}</p>`,
                    yes: () => {
                        //const userId = game.user.id;
                        //const db = CONFIG.DatabaseBackend;
                        /*
                        // Delete or move sub-Folders
                        const deleteFolderIds = [];
                        for (let f of folder.getSubfolders()) {
                            deleteFolderIds.push(f.id);
                        }
                        if (deleteFolderIds.length) {
                            db._handleDeleteDocuments({
                                request: { type: "Folder", options: { deleteSubfolders: true, deleteContents: true, render: true } },
                                result: deleteFolderIds,
                                userId
                            });
                        }*/

                        // Delete contained Documents
                        const deleteDocumentIds = [];
                        for (let d of folder.documentCollection) {
                            if (d.folder !== folder.id) continue;
                            deleteDocumentIds.push(d.id);
                        }
                        if (deleteDocumentIds.length) {
                            const cls = getDocumentClass(folder.type);
                            return cls.deleteDocuments(deleteDocumentIds);
                        }
                    },
                    options: {
                        top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                        left: window.innerWidth - 720,
                        width: 400,
                    },
                });
            }
        },
    });
});

Hooks.on("renderMacroConfig", (app, html, data) => {
    $(".sheet-footer", html).prepend(
        $("<button>")
            .attr("type", "button")
            .html('<i class="fas fa-file-download"></i> Apply')
            .on("click", (event) => {
                app._onSubmit.call(app, event, { preventClose: true });
            })
    );

    if (setting("macro-tabs")) {
        $('textarea[name="command"]', html).on("keydown", function (e) {
            if (e.key == "Tab") {
                e.preventDefault();
                e.stopPropagation();
                var start = this.selectionStart;
                var end = this.selectionEnd;

                // set textarea value to: text before caret + tab + text after caret
                this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);

                // put caret at right position again
                this.selectionStart = this.selectionEnd = start + 1;
                $(this).trigger("input");
            }
        });
    }
});

Hooks.on("updateSetting", (setting, data, options, userid) => {
    if (setting.key.startsWith("monks-little-details")) {
        const key = setting.key.replace("monks-little-details.", "");
        if (MonksLittleDetails._setting.hasOwnProperty(key)) MonksLittleDetails._setting[key] = data.value;
    }
});

Hooks.on("renderModuleManagement", (app, html, data) => {
    if (setting("module-management-changes")) {
        let requires = {};

        let scrollToView = function (ev) {
            let module = $(ev.currentTarget).html();
            let div = $(`.package[data-module-id="${module}"]`, html);
            if (div.length) {
                div[0].scrollIntoView({ behavior: "smooth" });
            }
        };

        for (let mod of data.modules) {
            if (mod.relationships.requires.length) {
                for (let dep of mod.relationships.requires) {
                    if (requires[dep] == undefined) requires[dep] = [mod.name];
                    else requires[dep].push(mod.name);

                    let hasModule = data.modules.find((m) => (m.id || m.name) == dep);
                    $(`.package[data-module-id="${mod.id || mod.name}"] .package-metadata .tag`, html).each(
                        function () {
                            if ($(this).html() == dep) {
                                $(this).addClass(hasModule ? (hasModule.active ? "success" : "info") : "danger");
                            }
                            $(this).on("click", scrollToView.bind(this));
                        }
                    );
                }
            }
        }

        for (let [req, values] of Object.entries(requires)) {
            let li = $("<li>").appendTo($(`.package[data-module-id="${req}"] .package-metadata`, html));
            li.append($("<strong>").html("Supports:"));
            for (let val of values) {
                li.append($("<span>").addClass("tag").html(val).on("click", scrollToView.bind(this)));
            }
        }
    }
});

Hooks.on("getActorDirectoryEntryContext", (html, entries) => {
    if (game.system.id == "dnd5e") {
        entries.push({
            name: "Transform into this Actor",
            icon: '<i class="fas fa-random"></i>',
            condition: (li) => {
                const actor = game.actors.get(li.data("documentId"));
                const canPolymorph =
                    game.user.isGM || (actor.isOwner && game.settings.get("dnd5e", "allowPolymorphing"));
                return canPolymorph;
            },
            callback: async (li) => {
                let data = {
                    id: li.data("documentId"),
                };

                let actors = canvas.tokens.controlled.map((t) => t.actor);

                if (actors.length == 0 && !game.user.isGM) actors = [game.user.character];

                for (let actor of actors) {
                    actor.sheet._onDropActor(null, data);
                }
            },
        });
    }
});

Hooks.on("getCompendiumEntryContext", (html, entries) => {
    entries.push({
        name: "Transform into this Actor",
        icon: '<i class="fas fa-random"></i>',
        condition: (li) => {
            if (!$(li).hasClass("actor")) return false;
            const canPolymorph = game.user.isGM || game.settings.get("dnd5e", "allowPolymorphing");
            return canPolymorph;
        },
        callback: async (li) => {
            let compendium = $(li).closest(".directory");
            let data = {
                pack: compendium.data("pack"),
                id: li.data("documentId"),
            };

            let actors = canvas.tokens.controlled.map((t) => t.actor);

            if (actors.length == 0 && !game.user.isGM) actors = [game.user.character];

            for (let actor of actors) {
                actor.sheet._onDropActor(null, data);
            }
        },
    });
});

Hooks.on("updateScene", (scene, data, options) => {
    if (
        (data.darkness == 0 || data.darkness == 1) &&
        options.animateDarkness != undefined &&
        ui.controls.activeControl == "lighting"
    ) {
        let tool = $(`#controls .sub-controls .control-tool[data-tool="${data.darkness == 0 ? "day" : "night"}"]`);
        $("#darkness-progress").remove();

        let leftSide = $("<div>").attr("deg", 0);
        let rightSide = $("<div>").attr("deg", 0);

        let progress = $("<div>")
            .attr("id", "darkness-progress")
            .append($("<div>").addClass("progress-left-side").append(leftSide))
            .append($("<div>").addClass("progress-right-side").append(rightSide));

        tool.append(progress).css({ position: "relative", overflow: "hidden" });

        let halfTime = options.animateDarkness / 2;

        $(rightSide).animate(
            { deg: 180 },
            {
                duration: halfTime,
                step: function (now) {
                    if (!!rightSide.attr("stop")) rightSide.stop();
                    rightSide.css({
                        transform: "rotate(" + now + "deg)",
                    });
                },
                complete: function () {
                    $(leftSide).animate(
                        { deg: 180 },
                        {
                            duration: halfTime,
                            step: function (now) {
                                if (!!leftSide.attr("stop")) leftSide.stop();
                                leftSide.css({
                                    transform: "rotate(" + now + "deg)",
                                });
                            },
                            complete: function () {
                                progress.remove();
                                tool.css({ overflow: "" });
                            },
                        }
                    );
                },
            }
        );
    }
});

Hooks.on("renderCombatTrackerConfig", (app, html, data) => {
    $("<div>")
        .addClass("form-group")
        .append($("<label>").html("Hide Defeated?"))
        .append(
            $("<input>")
                .attr("type", "checkbox")
                .attr("name", "hideDefeated")
                .attr("data-dtype", "Boolean")
                .prop("checked", setting("hide-defeated") == true)
        )
        .append(
            $("<p>")
                .addClass("notes")
                .html("Automatically hide combatants marked as defeated?  Requires skip defeated.")
        )
        .insertAfter($('input[name="skipDefeated"]', html).closest(".form-group"));

    app.setPosition({ height: "auto" });
});

Hooks.on("renderFilePicker", (app, html, data) => {
    if ($("button.quick-links", html).length) return;

    const selectItem = function (event) {
        event.preventDefault();
        event.stopPropagation();
        app.browse(this.target);
        $(".quick-links-list.open").removeClass("open");
    };

    const toggleFavorite = function (event) {
        event.preventDefault();
        event.stopPropagation();

        let quicklinks = duplicate(game.user.getFlag("monks-little-details", "quicklinks") || []);
        let link = quicklinks.find((q) => q.target == this.target);
        link.favorite = !link.favorite;
        game.user.setFlag("monks-little-details", "quicklinks", quicklinks);
        $(`.quick-link-item[target="${this.target}"] .quick-favorite i`)
            .toggleClass("fa-solid", link.favorite)
            .toggleClass("fa-regular", !link.favorite);
    };

    let quicklinks = game.user.getFlag("monks-little-details", "quicklinks") || [];
    let favorites = [];
    let regular = quicklinks.filter((q) => {
        if (q.favorite) favorites.push(q);
        return !q.favorite;
    });

    let list = $("<ul>").addClass("quick-links-list");

    if (quicklinks.length == 0) list.append($("<li>").addClass("no-quick-links").html("No quick links yet"));
    else {
        list.append(
            favorites.concat(regular).map((j) => {
                return $("<li>")
                    .addClass("quick-link-item flexrow")
                    .attr("target", j.target)
                    .append(
                        $("<div>")
                            .addClass("quick-favorite")
                            .html(`<i class="fa-star ${j.favorite ? "fa-solid" : "fa-regular"}"></i>`)
                            .click(toggleFavorite.bind(j))
                    )
                    .append($("<div>").addClass("quick-title").html(j.target))
                    .click(selectItem.bind(j));
            })
        );
    }

    $(html).click(function () {
        list.removeClass("open");
    });

    $('input[name="target"]', html)
        .after(
            $("<button>")
                .attr("type", "button")
                .addClass("quick-links")
                .append($("<i>").addClass("fas fa-caret-down"))
                .click(function (evt) {
                    $(".quick-links-list", html).removeClass("open");
                    list.toggleClass("open");
                    evt.preventDefault();
                    evt.stopPropagation();
                })
        )
        .after(list);
    $('input[name="target"]', html).parent().css({ position: "relative" });
});

Hooks.on("preUpdateItem", (item, data, options, user) => {
    if (
        setting("prevent-combat-spells") != "false" &&
        !game.user.isGM &&
        user == game.user.id &&
        getProperty(data, "system.preparation.prepared") != undefined
    ) {
        //Is this actor involved in a combat
        let inCombat = game.combats.some((c) => {
            return c.started && c.active && c.turns.some((t) => t.actorId == item.actor.id);
        });

        if (inCombat) {
            if (setting("prevent-combat-spells") == "prevent") {
                ui.notifications.warn("Cannot change prepared spells while in combat");
                delete data.system.preparation.prepared;
                if (Object.keys(data.system.preparation).length == 0) delete data.system.preparation;
                if (Object.keys(data.system).length == 0) delete data.system;
                if (Object.keys(data).length == 0) return false;
            } else if (setting("prevent-combat-spells") == "true") {
                MonksLittleDetails.emit("spellChange", { user: game.user.id, actor: item.actor.id, name: item.name });
            }
        }
    }
});
