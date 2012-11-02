## Implementation steps
* Setup project using templates
* remove chrome.storage.sync
* remove keyboard shortcuts
* Whitelist all urls
* remove the close icon
* increase click target size of settings
* try to get city switching to work -- seems buggy even on desktop (prev/next not working)
 * odd bug with query live() onclick event -- workaround: just add an empty dumb click target after adding a new location!  very odd, not sure if web view or jQuery issue
* Implement chrome.storage.sync
* Add swipe handlers for moving between cities
 * removed "pagination" because its less important on touch device.. and was buggy
* Disabled touch move scrolling of webpage so that it feels like an app
 * Then re-enabled it for settings page due to virtual keyboard
* Add support for backbutton on android
* Fixing up Weather app bugs (not porting specific)
* Backporting changes to work on desktop (single version for both)
 * js to add "mobile" "non-mobile" style on startup
* General improvements to add editing -- clearing errors, multiple city add, enter button support
