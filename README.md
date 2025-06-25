# Monk's Little Details
A bunch of quality of life improvements to make your games run smoother.

## Installation
Simply use the install module screen within the FoundryVTT setup

## Usage & Current Features

### Core Css Changes
The images displayed for the filepicker and compendiums crops the image if it's not square, due to the object-fit being set to cover.  I think it looks a bit better as contain instead. 

Before

![monks-little-details](/screenshots/CoreCssBefore.webp)

After

![monks-little-details](/screenshots/CoreCssAfter.webp)

I also changed the scene compendium items to more closely match the styling used on the scene tab.  The wider image gives you a better idea of what you're seeing.  There's also an additional button to open the scene as an image instead of as a configuration.  This is useful to see what scene you have before importing it.

Scene Compendium

![monks-little-details](/screenshots/SceneCompendium.png)

Also added changes to the chat sidebar so that it doesn't have a transparent background.  This can be really distracting if you're moving around the map and the chat sidebar is open.  Now it has a solid background so you can see the text more clearly.

### Altered Status Effects
I can never remember what the icons stand for.  So you can now see the text along side the images, and have them sorted either in rows or in columns.  This makes finding them a lot easier.  Also a clear all button has been added in case you want to get rid of all the statuses quickly.  And each item is highlighted in bold orange so it's easier at a glance to see what's been selected.  And added some more of the standard statuses you might encounter in a 5e game.

![monks-little-details](/screenshots/TokenHUDUpdates.webp)

### Changed the invisible image
Changed the invisible icon from the standard Masked Man image to one that more closely resembles a 5e graphic.

### Dominant Scene Colours
Added the top 5 dominant colours of a scene so that you can choose a background colour that blends with the scene a bit better.

![monks-little-details](/screenshots/BackgroundPalette.png)

You can also use this to find the dominant colour in your player avatar and change your player colour to one of the top 5.

![monks-little-details](/screenshots/PlayerPalette.png)

### GM Move characters
If you select characters, hold down the M Key and clicking on another map location, or holding down the M key and dragging the tokens will instantly move them there.  I found dragging them there has unfortunate side effects of showing spaces they shouldn't see while they're moving.  Teleporting them there preserves the fog of war between the two spots.  Handy for when you're using a map that has multiple levels on one image.  You can teleport from one area to the other quickly.

### Swap tools by holding down a key
Monks Little Details will let you briefly activate another tool by holding down a key.  Pressing Shift+key will change the tool.  This allows you to switch briefly to other layers such as the Tiles layer to update a tile to visible before releasing the key and switching back to whatever layer you were on before. 


### Release all targets with keypress
When you have a target selected, you can press the T key to release all targets.  This is useful if you want to quickly release all targets.

### Click anywhere to close Main Menu
Currently when you open the Main Menu, the only way to close it is to press the Escape Key.  This module will allow you to click anywhere on the screen to close the Main Menu.  This is useful if you want to quickly return to the game without having to remember that Escape key.

### Directory Padding
Added the ability to customise the padding of the directory.  This is useful if you want a better indication of folder depth.  You can set the padding in the settings menu.

### Compendium type filtering
Added quick filter buttons on the compendium sidebar to quickly filter by type.  This is useful if you want to quickly find a specific type of compendium item.
![monks-little-details](/screenshots/CompendiumsFilter.png)

### Filepicker Quicklinks
Changed the filepicker to have a cleaner look and feel for favorites.  You can now click the star to favorite a folder and add it to the list of quicklinks.  This is useful if you have a lot of folders and want to quickly access a specific folder.  This will also save the last folders visited so you can quickly go back to them without having to navigate through the entire directory structure again.
![monks-little-details](/screenshots/FilepickerQuicklinks.png)

### Find my token
Added a button to the token toolbar that will find your token on the map.  This is useful if you lose track of where your token is on the map.  If you are the GM it will cycle through all the tokens on the map.
![monks-little-details](/screenshots/FindMyToken.png)

### Retain the notify
Currently when you get a chat message you get a pip on the side bar icon.  This isn't really useful if that tab is open.  And if you're on a diferent tab, the pip disappears after a few seconds.  Little Details changes this, so the pip doesn't appear if the chat tab is open, and if you're on a different tab, the pip will remain until you click on the chat tab.  This is useful if you want to be able to see when you've received a message without having to switch tabs.

### Pause border
Added a border around the screen to indicate when the game is paused.  This is useful if you want to be able to see when the game is paused at a glance.  It's not as applicable in v13 since the updates to the pause indication, but it still provides a visual cue that the game is paused.

### Player sheet quick open
Added right click to the actor tab button to open the last character sheet you had viewed.  This is useful if you want to quickly access the character sheet without having to navigate through the entire directory structure again.  And as a player it means you can view your character quickly without having to open the actor directory.

### Dual monitor support
If you stretch your browser between two monitors to get more space, this will now position dialogs and popups centered on one side or the other, instead of in the center where the monitor breaks are.  This is useful if you want to be able to see the dialogs and popups without having to move them around every time you open them.

### Macro editor Apply button
Added an Apply button to the macro editor so you can apply changes without having to close the editor.  This is useful if you want to be able to quickly apply changes without closing the editor every time you save.

### Batch update compendium images
Added a function to batch update compendium images.  This is useful if you have folders of images that you want to use in a compendium and don't want to have to manually update each image.  You can now select a folder and it will update all the images in that folder to the compendium.  By attempting to match the name of the actor with the filename of the image.  If it finds a match, it will update the image in the compendium with the image from the folder.  This is useful if you have a lot of actors and want to quickly update their images without having to manually update each one.  You can access this from the settings menu.

### Added module information
Added additional module information to Module Management. This will highlight any module dependencies that are missing, and will show what modules are dependent on the module.  The tags are also clickable to quickly navigate to other modules.
![monks-little-details](/screenshots/ModuleSupport.png)
![monks-little-details](/screenshots/ModuleDependency.png)
![monks-little-details](/screenshots/ModuleError.png)

### Folder clearing
Added an additional context menu item to quickly clear a folder.  Currently the only options involve destroying the folder in question, but if you only want to remove the contents of the folder, you can now do that without having to manually select each item and delete it.  This is useful if you want to quickly clear a folder without having to manually select each item and delete it.

### Polymorph context items
If you want to quickly transform into another Actor, currently you have to drag an actor onto the actor you want changes.  Little Details adds context menu items for actors in the Actor Directory or from a Compendium.  This allows you to right click and quickly transform into another Actor without having to drag and drop.

### Darkness progress bar
Added a transition progress notification to alert you to how long it will take for the transition to complete when you change the darkness level.  This is useful if you want to be able to see how long it will take for the transition to complete without having to wait for it to finish.

### Copy document image path
For documents that have an associated image, there is a button on the menu bar that will copy the image path to the clipboard.  This is useful if you want to save the image path for later use, or if you want to share the image with someone else.  You can access this from the document menu bar.
![monks-little-details](/screenshots/ImagePath.png)

### Chat Message time tooltip
Added a tooltip to the chat message time that will show the full date and time of the message.  This is useful if you want to be able to see when a message was sent without having to calculate from the relative time presented.
![monks-little-details](/screenshots/ChatTooltip.png)


## Where have my features gone?
Monk's Little details used to do a lot of things and it got a bit out of control with the features that were added.

The module shas been split into multiple additional modules that are each responsible for a distinct feature originally provided by Little Details.

### Actor Sounds
Actor sounds have moved to Monk's Sound Enhancements.

### Bloodsplats
Bloodsplats have been moved to their own module, Monk's Bloodsplats

### Chat Timer
Chat Timer has moved to its own modules, Monk's Chat Timer

### Combat Tracker
The combat image displayed when a token has its turn has moved to Monk's Combat Marker.

### Combat Details
Any of the features that revolved around automating combat has been moved to Monk's Combat Details

## Bug Reporting
I'm sure there are lots of issues with it.  It's very much a work in progress.
Please feel free to contact me on discord if you have any questions or concerns. ironmonk88#4075

## Support

If you feel like being generous, stop by my <a href="https://www.patreon.com/ironmonk">patreon</a>.

Or [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R7BH5MT)

Not necessary but definitely appreciated.

## License
This Foundry VTT module, writen by Ironmonk, is licensed under [GNU GPLv3.0](https://www.gnu.org/licenses/gpl-3.0.en.html), supplemented by [Commons Clause](https://commonsclause.com/).

This work is licensed under Foundry Virtual Tabletop <a href="https://foundryvtt.com/article/license/">EULA - Limited License Agreement for module development from May 29, 2020.</a>
