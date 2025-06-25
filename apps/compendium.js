import { MonksLittleDetails, log, setting, i18n, patchFunc } from '../monks-little-details.js';

export class MonksCompendium {
    static init() {
        patchFunc("foundry.applications.sidebar.tabs.CompendiumDirectory.prototype._onSearchFilter", function (wrapped, ...args) {
            wrapped(...args);
            const [event, query, rgx, html] = args;
            MonksCompendium._onCompendiumFilter(html);
        });

        Hooks.on("renderCompendiumDirectory", (app, html, options) => {
            if (setting("compendium-shortcuts")) {
                let shortcut = $('<div>').addClass('action-buttons flexrow').append(`
                    <nav class="tabs compendium-shortcut-links">
                        <button type="button" class="inline-control icon filter-compendium fas fa-user" data-tab="Actor" data-tooltip="DOCUMENT.Actors" alt="DOCUMENT.Actors" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-map-pin" data-tab="Adventure" data-tooltip="DOCUMENT.Adventures" alt="DOCUMENT.Adventures" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fa-solid fa-cards" data-tab="Cards" data-tooltip="DOCUMENT.CardPlural" alt="DOCUMENT.CardPlural" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-suitcase" data-tab="Item" data-tooltip="DOCUMENT.Items" alt="DOCUMENT.Items" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-book-open" data-tab="JournalEntry" data-tooltip="DOCUMENT.JournalEntries" alt="DOCUMENT.JournalEntries" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-code" data-tab="Macro" data-tooltip="DOCUMENT.Macros" alt="DOCUMENT.Macros" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-music" data-tab="Playlist" data-tooltip="DOCUMENT.Playlists" alt="DOCUMENT.Playlists" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-th-list" data-tab="RollTable" data-tooltip="DOCUMENT.RollTables" alt="DOCUMENT.RollTables" data-action="filterCompendium">
                        </button>
                        <button type="button" class="inline-control icon filter-compendium fas fa-map" data-tab="Scene" data-tooltip="DOCUMENT.Scenes" alt="DOCUMENT.Scenes" data-action="filterCompendium">
                        </button>
                    </nav>`);
                $('.filter-compendium', shortcut).on("click", (evt) => {
                    let id = evt.currentTarget.dataset.tab;
                    $(evt.currentTarget).toggleClass("active");
                    MonksCompendium._onSearchFilter(html);
                });
                $('.directory-header', html).append(shortcut);
            }
        });
    }

    static _onSearchFilter(html) {
        const searchInput = $("input[name='search']", html)[0];
        const inputEvent = new Event('input');
        searchInput.dispatchEvent(inputEvent);
    }

    static _onCompendiumFilter(html) {
        const types = $(".filter-compendium.active", html.parentElement).map((idx, el) => {
            return el.dataset.tab
        }).toArray();

        if (types.length === 0)
            return;

        const packs = new Set();
        const folderIds = new Set();
        const autoExpandIds = new Set();

        MonksCompendium._matchSearchEntries(types, packs, folderIds, autoExpandIds);

        // Toggle each directory entry.
        for (const el of html.querySelectorAll(".directory-item")) {
            if (el.hidden) continue;
            if (el.classList.contains("folder")) {
                const { folderId, uuid } = el.dataset;
                const match = folderIds.has(folderId);
                if (!match)
                    el.style.display = "none";
                if (autoExpandIds.has(folderId)) {
                    if (match) el.classList.add("expanded");
                }
                else el.classList.toggle("expanded", uuid in game.folders._expanded);
            }
            else MonksCompendium._onMatchSearchEntry(types, el);
        }
    }

    static _matchSearchEntries(types, packs, folderIds, autoExpandIds) {
        for (const pack of game.packs) {
            const { collection, folder, documentName } = pack;

            if (types.includes(documentName)) {
                packs.add(collection);
                MonksCompendium.onMatchFolder(folder, folderIds, autoExpandIds);
            }
        }
    }

    static onMatchFolder(folder, folderIds, autoExpandIds, { autoExpand = true } = {}) {
        if (typeof folder === "string") folder = game.packs.folders.get(folder);
        if (!folder) return;
        const folderId = folder._id;
        const visited = folderIds.has(folderId);
        folderIds.add(folderId);
        if (autoExpand) autoExpandIds.add(folderId);
        if (!visited && folder.folder) MonksCompendium.onMatchFolder(folder.folder, folderIds, autoExpandIds);
    }

    static _onMatchSearchEntry(types, element) {
        var pack = element.dataset.pack;
        var compendium = game.packs.get(pack);
        if (!types.includes(compendium.documentName))
            element.style.display = "none";
    }
}