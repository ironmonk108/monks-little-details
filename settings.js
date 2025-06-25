import { MonksLittleDetails, i18n } from "./monks-little-details.js";
import { UpdateImages } from "./apps/update-images.js"
import { EditEffects } from "./apps/edit-effects.js";

export const registerSettings = function () {
	// Register any custom module settings here
	let modulename = "monks-little-details";

	let sortstatus = {
		'none': i18n("MonksLittleDetails.sortstatus.none"),
		'rows': i18n("MonksLittleDetails.sortstatus.rows"),
		'columns': i18n("MonksLittleDetails.sortstatus.columns")
	};


	let dualMonitor = {
		'none': i18n("MonksLittleDetails.dualmonitor.none"),
		'left': i18n("MonksLittleDetails.dualmonitor.left"),
		'right': i18n("MonksLittleDetails.dualmonitor.right")
	};

	game.settings.registerMenu(modulename, 'update-images', {
		name: 'Update Images',
		label: i18n("MonksLittleDetails.update-images.name"),
		hint: 'Open a dialog to mass update compendium actor images',
		icon: 'fas fa-image',
		restricted: true,
		type: UpdateImages
	});

	game.settings.registerMenu(modulename, 'editEffects', {
		name: 'Edit Effects',
		label: 'Edit Effects',
		hint: 'Edit additional status effects',
		icon: 'fas fa-align-justify',
		restricted: true,
		type: EditEffects
	});

	//System changes
	game.settings.register(modulename, "alter-hud", {
		name: i18n("MonksLittleDetails.alter-hud.name"),
		hint: i18n("MonksLittleDetails.alter-hud.hint"),
		scope: "world",
		config: MonksLittleDetails.canDo("alter-hud"),
		default: true,
		type: Boolean,
		requiresReload: true
	});
	game.settings.register(modulename, "clear-all", {
		name: i18n("MonksLittleDetails.clear-all.name"),
		hint: i18n("MonksLittleDetails.clear-all.hint"),
		scope: "world",
		config: MonksLittleDetails.canDo("clear-all"),
		default: true,
		type: Boolean
	});
	game.settings.register(modulename, "sort-by-columns", {
		name: i18n("MonksLittleDetails.sort-by-columns.name"),
		hint: i18n("MonksLittleDetails.sort-by-columns.hint"),
		scope: "client",
		config: false,
		default: false,
		type: Boolean,
	});
	game.settings.register(modulename, "sort-statuses", {
		name: i18n("MonksLittleDetails.sort-statuses.name"),
		hint: i18n("MonksLittleDetails.sort-statuses.hint"),
		scope: "client",
		config: MonksLittleDetails.canDo("sort-statuses"),
		default: 'rows',
		type: String,
		choices: sortstatus
	});
	game.settings.register(modulename, "alter-hud-colour", {
		name: i18n("MonksLittleDetails.alter-hud-colour.name"),
		hint: i18n("MonksLittleDetails.alter-hud-colour.hint"),
		scope: "world",
		config: MonksLittleDetails.canDo("alter-hud"),
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "add-extra-statuses", {
		name: i18n("MonksLittleDetails.add-extra-statuses.name"),
		hint: i18n("MonksLittleDetails.add-extra-statuses.hint"),
		scope: "world",
		config: game.system.id != "pf2e",
		default: game.system.id == "dnd5e",
		type: Boolean,
		requiresReload: true
	});
	game.settings.register(modulename, "change-invisible-image", {
		name: i18n("MonksLittleDetails.change-invisible-image.name"),
		hint: i18n("MonksLittleDetails.change-invisible-image.hint"),
		scope: "world",
		config: MonksLittleDetails.canDo("change-invisible-image"),
		default: true,
		type: Boolean,
		requiresReload: true
	});
	game.settings.register(modulename, "core-css-changes", {
		name: i18n("MonksLittleDetails.core-css-changes.name"),
		hint: i18n("MonksLittleDetails.core-css-changes.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		requiresReload: true
	});
	game.settings.register(modulename, "window-css-changes", {
		name: i18n("MonksLittleDetails.window-css-changes.name"),
		hint: i18n("MonksLittleDetails.window-css-changes.hint"),
		scope: "world",
		config: true,
		default: !game.modules.get("pf2e-dorako-ui")?.active,
		type: Boolean,
		onChange: (value) => {
			$('body').toggleClass("change-windows", value);
		}
	});
	game.settings.register(modulename, "chat-css-changes", {
		name: i18n("MonksLittleDetails.chat-css-changes.name"),
		hint: i18n("MonksLittleDetails.chat-css-changes.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: (value) => {
			$('body').toggleClass("change-chat", value);
		}
	});
	game.settings.register(modulename, "directory-padding", {
		name: i18n("MonksLittleDetails.directory-padding.name"),
		hint: i18n("MonksLittleDetails.directory-padding.hint"),
		scope: "world",
		config: true,
		range: {
			min: 1,
			max: 10,
			step: 1,
		},
		default: 4,
		type: Number,
		onChange: (value) => {
			var r = document.querySelector(':root');
			r.style.setProperty('--sidebar-padding', `${value}px`);
		}
	});
	game.settings.register(modulename, "compendium-additional", {
		name: i18n("MonksLittleDetails.compendium-additional.name"),
		hint: i18n("MonksLittleDetails.compendium-additional.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		requiresReload: true
	});
	game.settings.register(modulename, "compendium-shortcuts", {
		name: i18n("MonksLittleDetails.compendium-shortcuts.name"),
		hint: i18n("MonksLittleDetails.compendium-shortcuts.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		requiresReload: true
	});
	game.settings.register(modulename, "compendium-view-artwork", {
		name: game.i18n.localize("MonksLittleDetails.compendium-view-artwork.name"),
		hint: game.i18n.localize("MonksLittleDetails.compendium-view-artwork.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "add-quicklinks", {
		name: game.i18n.localize("MonksLittleDetails.add-quicklinks.name"),
		hint: game.i18n.localize("MonksLittleDetails.add-quicklinks.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "remove-favorites", {
		name: game.i18n.localize("MonksLittleDetails.remove-favorites.name"),
		hint: game.i18n.localize("MonksLittleDetails.remove-favorites.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	//Added Features
	game.settings.register(modulename, "scene-palette", {
		name: i18n("MonksLittleDetails.scene-palette.name"),
		hint: i18n("MonksLittleDetails.scene-palette.hint"),
		scope: "world",
		config: true,
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "find-my-token", {
		name: i18n("MonksLittleDetails.find-my-token.name"),
		hint: i18n("MonksLittleDetails.find-my-token.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "show-notify", {
		name: i18n("MonksLittleDetails.show-notify.name"),
		hint: i18n("MonksLittleDetails.show-notify.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "highlight-notify", {
		name: i18n("MonksLittleDetails.highlight-notify.name"),
		hint: i18n("MonksLittleDetails.highlight-notify.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "lighting-progress", {
		name: i18n("MonksLittleDetails.lighting-progress.name"),
		hint: i18n("MonksLittleDetails.lighting-progress.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "pause-border", {
		name: i18n("MonksLittleDetails.pause-border.name"),
		hint: i18n("MonksLittleDetails.pause-border.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		onChange: (value) => {
			if (value && game.paused && $('#board').length)
				$("body").addClass("mld-paused");
			else
				$("body").removeClass("mld-paused");
		}
	});
	game.settings.register(modulename, "pause-border-colour", {
		name: i18n("MonksLittleDetails.pause-border-colour.name"),
		hint: i18n("MonksLittleDetails.pause-border-colour.hint"),
		scope: "world",
		config: true,
		default: "#4DD0E1",
		type: String,
		onChange: (value) => {
			var r = document.querySelector(':root');
			const rgb = Color.from(value).rgb;
			r.style.setProperty('--pause-border-color', `${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255}`);
		}
	});
	game.settings.register(modulename, "open-actor", {
		name: i18n("MonksLittleDetails.open-actor.name"),
		hint: i18n("MonksLittleDetails.open-actor.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register(modulename, "reposition-collapse", {
		name: i18n("MonksLittleDetails.reposition-collapse.name"),
		hint: i18n("MonksLittleDetails.reposition-collapse.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
		requiresReload: true
	});
	
	game.settings.register(modulename, "module-management-changes", {
		name: i18n("MonksLittleDetails.module-management-changes.name"),
		hint: i18n("MonksLittleDetails.module-management-changes.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	game.settings.register(modulename, "key-swap-tool", {
		name: i18n("MonksLittleDetails.key-swap-tool.name"),
		hint: i18n("MonksLittleDetails.key-swap-tool.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "dual-monitor", {
		name: i18n("MonksLittleDetails.dual-monitor.name"),
		hint: i18n("MonksLittleDetails.dual-monitor.hint"),
		scope: "client",
		config: true,
		default: "none",
		type: String,
		choices: dualMonitor
	});

	game.settings.register(modulename, "additional-effects", {
		scope: "world",
		config: false,
		default: game.system.id !== "pf2e" ? [
			{ "id": "charmed", "name": "MonksLittleDetails.StatusCharmed", "img": "modules/monks-little-details/icons/smitten.svg" },
			{ "id": "exhausted", "name": "MonksLittleDetails.StatusExhausted", "img": "modules/monks-little-details/icons/oppression.svg" },
			{ "id": "grappled", "name": "MonksLittleDetails.StatusGrappled", "img": "modules/monks-little-details/icons/grab.svg" },
			{ "id": "incapacitated", "name": "MonksLittleDetails.StatusIncapacitated", "img": "modules/monks-little-details/icons/internal-injury.svg" },
			{ "id": "petrified", "name": "MonksLittleDetails.StatusPetrified", "img": "modules/monks-little-details/icons/stone-pile.svg" },
			{ "id": "hasted", "name": "MonksLittleDetails.StatusHasted", "img": "modules/monks-little-details/icons/running-shoe.svg" },
			{ "id": "slowed", "name": "MonksLittleDetails.StatusSlowed", "img": "modules/monks-little-details/icons/turtle.svg" },
			{ "id": "concentration", "name": "MonksLittleDetails.StatusConcentrating", "img": "modules/monks-little-details/icons/beams-aura.svg" },
			{ "id": "rage", "name": "MonksLittleDetails.StatusRage", "img": "modules/monks-little-details/icons/enrage.svg" },
			{ "id": "distracted", "name": "MonksLittleDetails.StatusDistracted", "img": "modules/monks-little-details/icons/distraction.svg" },
			{ "id": "dodging", "name": "MonksLittleDetails.StatusDodging", "img": "modules/monks-little-details/icons/dodging.svg" },
			{ "id": "disengage", "name": "MonksLittleDetails.StatusDisengage", "img": "modules/monks-little-details/icons/journey.svg" },
			{ "id": "cover", "name": "MonksLittleDetails.StatusCover", "img": "modules/monks-little-details/icons/push.svg" },
			{ "id": "turned", "name": "MonksLittleDetails.StatusTurned", "img": "modules/monks-little-details/icons/turned.svg" },
		] : [],
		type: Array,
	});
};
