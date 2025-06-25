import { MonksLittleDetails, log, error, setting, i18n } from '../monks-little-details.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class UpdateImages extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(object, options) {
        super(object, options);

        this.autoscroll = true;
    }

    static DEFAULT_OPTIONS = {
        id: "update-images",
        tag: "form",
        classes: ["update-images", "monks-little-details"],
        window: {
            contentClasses: ["standard-form"],
            icon: "fa-solid fa-image",
            resizable: false,
            title: "Update Images",
        },
        actions: {
            convert: UpdateImages.convert,
        },
        position: {
            width: 700,
            height: 'auto'
        }
    };

    static PARTS = {
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        details: { template: "modules/monks-little-details/templates/details-tab.hbs" },
        results: { template: "modules/monks-little-details/templates/results-tab.hbs" },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: "details", icon: "fa-solid fa-cubes" },
                { id: "results", icon: "fa-solid fa-list" },
            ],
            initial: "details",
            labelPrefix: "MonksLittleDetails.UPDATEIMAGES.TABS"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        let data = context.tabs.details;

        data.compendiums = {};
        for (let pack of game.packs) {
            if (pack.metadata.type == "Actor") {
                data.compendiums[pack.collection] = `${pack.title} - (${pack.metadata.packageName})`
            }
        }
        data.compendium = game.user.getFlag("monks-little-details", "compendium");

        for (let i = 1; i <= 3; i++) {
            data["avatar-folder" + i] = game.user.getFlag("monks-little-details", "avatar" + i);
            data["token-folder" + i] = game.user.getFlag("monks-little-details", "token" + i);
        }
        data["sound-folder"] = game.user.getFlag("monks-little-details", "sound-folder");

        return context;
    }

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);
        if (partId in context.tabs) context.tab = context.tabs[partId];
        return context;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        $('.conversion-results', this.element).on("scroll", this.scrollResults.bind(this))
    }

    scrollResults(event) {
        if (event.currentTarget.scrollTop + $(event.currentTarget).height() >= event.currentTarget.scrollHeight)
            this.autoscroll = true;
        else
            this.autoscroll = false;
    }

    static convert() {
        const formData = new foundry.applications.ux.FormDataExtended(this.form);
        const data = formData.object;

        $('.conversion-results', this.element).empty();
        this.changeTab("results", "sheet", { navElement: $(".tabs", this.element) });

        let pack = game.packs.get(data.compendium);

        game.user.setFlag("monks-little-details", "compendium", data.compendium);

        let avatars = [];
        for (let i = 1; i <= 3; i++) {
            if (data[`avatar-folder.${i}`])
                avatars.push(data[`avatar-folder.${i}`]);
            game.user.setFlag("monks-little-details", `avatar${i}`, data[`avatar-folder.${i}`]);
        }

        let tokens = [];
        for (let i = 1; i <= 3; i++) {
            if (data[`token-folder.${i}`])
                tokens.push(data[`token-folder.${i}`]);
            game.user.setFlag("monks-little-details", `token{i}`, data[`token-folder.${i}`]);
        }

        if (data["sound-folder"])
            game.user.setFlag("monks-little-details", "sound-folder", data["sound-folder"]);

        this.fixImages(pack, avatars, tokens, data["sound-folder"], { strict: data["strict-name"], wildcard: data["wildcards"]});

        log("Try converting", data);
    }

    async getFiles(filename, type) {
        let source = "data";
        let pattern = filename;
        let extensions = Object.keys(type == "sound" ? CONST.AUDIO_FILE_EXTENSIONS : CONST.IMAGE_FILE_EXTENSIONS).map(ext => `.${ext.toLowerCase()}`);
        const browseOptions = {
            wildcard: true,
            extensions: extensions
        };

        if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
            source = "forgevtt";
        }

        // Support S3 matching
        if (/\.s3\./.test(pattern)) {
            source = "s3";
            const { bucket, keyPrefix } = foundry.applications.apps.FilePicker.implementation.parseS3URL(pattern);
            if (bucket) {
                browseOptions.bucket = bucket;
                pattern = keyPrefix;
            }
        }

        // Retrieve wildcard content
        try {
            const content = await foundry.applications.apps.FilePicker.implementation.browse(source, pattern, browseOptions);
            return content.files;
        } catch (err) {
            error(err);
            return null;
        }
        return [];
    }

    async fixEntry(entry, prop, root, imgname, type, wildcard) {
        let files = await this.getFiles(root + imgname, type);
        if (files && files.length > 0) {
            let filenames = files.map(f => {
                let ext = f.split('.').pop();
                return {
                    name: f,
                    ext: ext
                }
            });
            filenames = filenames.sort((a, b) => { return b.ext.localeCompare(a.ext); });

            let usename = (root.startsWith("/") ? "/" : "") + filenames[0].name;
            if (wildcard && files.length > 1) {
                // figure out the correct extension
                let extension = filenames.map(f => f.name.split('.').pop()).filter((value, index, array) => array.indexOf(value) === index).sort((a, b) => b.localeCompare(a))[0];
                let names = filenames.filter(f =>
                    f.name.endsWith(extension)
                ).map(f => {
                    let name = f.name.replace(root.startsWith("/") ? root.substring(1) : root, "");
                    return name.substr(0, name.length - extension.length - 1);
                });
                if (names.length == 1)
                    usename = `${root}${names[0]}.${extension}`;
                else
                    usename = `${root}{${names.join(",")}}.${extension}`;
            }

            if (foundry.utils.getProperty(entry, prop) == usename) {
                this.addText(`<span>Ignoring ${type}: ${entry.name}, image is the same</span>`, "ignoring-update");
                return true;
            }

            let update = {};
            update[prop] = usename;
            if (prop.startsWith("prototypeToken") && wildcard) {
                update["prototypeToken.randomImg"] = true;
            }
            update = foundry.utils.expandObject(update);

            //try {
            log('Fixing:', entry.name, usename);
            this.addText(`<span>Fixing ${type}: ${entry.name}, ${usename}</span>`, "fixing-update");
            return update;
            //} catch {
            //    this.addText(`<span>Error: ${entry.name}, ${usename}</span>`, "error-update");
            //}
            //return true;
        }
        return false;
    }

    async fixImages(pack, avatars, tokens, sound, options) {
        let onlyUnique = function (value, index, self) {
            return self.indexOf(value) === index;
        }

        if (pack) {
            const oldLock = pack.locked;
            if (oldLock)
                await pack.configure({ locked: false });

            let updates = [];
            this.addText(`Start conversion: ${pack.title}`);
            await pack.getDocuments().then(async (entries) => {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    let update = {};
                    let names = [entry.name, entry.name.toLowerCase()];
                    let altname = entry.name.replace(/-/g, '').replace(/'/g, '').replace(/\(.*\)/, '').replace(/\s/g, '');
                    if (altname != entry.name) {
                        names.push(altname);
                        names.push(altname.toLowerCase());
                    }
                    if (entry.name.toLowerCase().startsWith("swarm")) {
                        altname = entry.name.replace(/SwarmOf/g, 'Swarm').replace(/Swarm Of/g, 'Swarm').replace(/Swarm of/g, 'Swarm').replace(/Swarmof/g, 'Swarm').replace(/swarmof/, 'swarm');
                        names.push(altname);
                        names.push(altname.toLowerCase());
                        altname = altname.replace(/-/g, '').replace(/'/g, '').replace(/\(.*\)/, '').replace(/\s/g, '');
                        names.push(altname);
                        names.push(altname.toLowerCase());
                    }
                    if (!options.strict) {
                        for (let name of foundry.utils.duplicate(names)) {
                            let flexname = name.replace('ancient', '').replace('adult', '').replace('young', '').replace('Ancient', '').replace('Adult', '').replace('Young', '');
                            if (flexname != name)
                                names.push(flexname);
                        }
                    }

                    var mtype = entry.system.details.type?.value?.toLowerCase() || entry.system.traits?.traits?.value || ""; //|| entry.system.details.creatureType?.toLowerCase()
                    mtype = (mtype instanceof Array ? mtype : [mtype]);
                    if (entry.name.toLowerCase().startsWith("swarm"))
                        mtype.push("swarm");
                    for (let i = 0; i < mtype.length; i++) {
                        if (mtype[i].indexOf(',') > 0) {
                            let temp = mtype[i].split(',');
                            mtype[i] = temp[0];
                            for (let j = 1; j < temp.length; j++)
                                mtype.push(temp[j]);
                        }
                        mtype[i] = mtype[i].replace(/\(.*\)/, '').replace(/\s/g, '');
                    }

                    mtype.unshift("");
                    mtype = mtype.filter(onlyUnique);

                    let found = false;
                    foundAvatar:
                    for (let avatar of avatars) {
                        for (let name of names) {
                            for (let type of mtype) {
                                let imgname = `${name}.*`;
                                let root = `${avatar}/${type != "" ? type + "/" : ""}`;
                                let result = await this.fixEntry(entry, "img", root, imgname, "avatar", false);
                                if (!!result) {
                                    found = true;
                                    if (result !== true) {
                                        foundry.utils.mergeObject(update, result);
                                    }
                                    break foundAvatar;
                                }
                            }
                        }
                    }
                    if (!found) {
                        this.addText(`<span>Unable to find avatar: ${entry.name}</span>`, "cant-find-update");
                    }

                    found = false;
                    foundToken:
                    for (let token of tokens) {
                        for (let name of names) {
                            for (let type of mtype) {
                                var imgname = `${name}${options.wildcard ? "*" : ".*"}`;
                                let root = `${token}/${type != "" ? type + "/" : ""}`;
                                let result = await this.fixEntry(entry, "prototypeToken.texture.src", root, imgname, "token", options.wildcard);
                                if (!!result) {
                                    found = true;
                                    if (result !== true) {
                                        foundry.utils.mergeObject(update, result);
                                    }
                                    break foundToken;
                                }
                            }
                        }
                    }
                    if (!found) {
                        this.addText(`<span>Unable to find token: ${entry.name}</span>`, "cant-find-update");
                    }

                    foundSound:
                    for (let name of names) {
                        for (let type of mtype) {
                            var soundname = `${name}${options.wildcard ? "*" : ".*"}`;
                            let root = `${sound}/${type != "" ? type + "/" : ""}`;
                            let result = await this.fixEntry(entry, "flags.monks-little-details.sound-effect", root, soundname, "sound", options.wildcard);
                            if (!!result) {
                                if (result !== true) {
                                    foundry.utils.mergeObject(update, result);
                                }
                                break foundSound;
                            }
                        }
                    }

                    if (!foundry.utils.isEmpty(update)) {
                        update._id = entry._id;
                        updates.push(update);
                    }
                }

                if (updates.length) {
                    this.addText(`Saving: ${pack.title}`);
                    await CONFIG.Actor.documentClass.updateDocuments(updates, { pack: pack.metadata.id });
                }

                if (oldLock)
                    pack.configure({ locked: true });
                log("Completed: " + pack.title);
                this.addText(`Completed: ${pack.title}`);
            });
        }
    }

    addText(text="", cls="") {
        $('.conversion-results', this.element).append($('<li>').addClass(cls).html(text));
        if (this.autoscroll) {
            $('.conversion-results', this.element).get(0).scrollTo(0, $('.conversion-results', this.element).get(0).scrollHeight);
        }
    }
}