# Calculator

A sample application that provides a simple calculator. Supports basic operations
such as addition, multiplication, subtraction and division.

This sample also incorporates an MVC-style structure and requires jQuery for
DOM manipulation.

## Mobile Changes and Comments

This version of the calculator is changed to work nicely on mobile (and hopefully desktop as well). Here's a list of the changes I had to make.

* I removed min/max Width/Height from main.js for testing on desktop by resizing the window, but that isn't necessary for mobile, which just ignores the size.
* The use of images for the calculator buttons makes resizing them impossible. I replaced them with appropriately styled table cells. This was the most complex change I had to make.
    * Had to remove several pieces of CSS hardcoded with the size of the window. The fixed size of the calculator popup was baked deeply into this code.
* The `overflow: scroll` was problematic because it requires a fixed height. I ended up using `position: absolute` for both the calculator display and the buttons, setting `top`, `bottom`, `left` and `right` instead of `padding`. Then the `overflow: scroll` started working.
* I used the same trick as mobile-spec to have a cordova.js that adds a `<script>` tag to the document for either `cordova.android.js` or `cordova.ios.js` depending on `navigator.userAgent.indexOf('Android')`. A similar hack may prove necessary to add platform-specific CSS.
* `<iframe>` doesn't work on Android 3 and later unless you set `<preference name="useBrowserHistory" value="true" />` in `config.xml`. The iframe takes over the main page and you get a blank white page.
* Fast clicks. This needs to be turned into a library and/or done by default. I'm not sure if we can do it automatically in general, since it depends on how the Chrome app is capturing clicks. Things work without fast clicks, but they're sluggish.
* Locking to portrait.
    * Android: Add `android:screenOrientation="portrait"` to `<activity>` in AndroidManifest.xml.
    * iOS: Seems to be the default. At least, it was already set as "portrait only" for me. Setting is found on the Summary screen of the app target in Xcode.


### Improvements

Some things that could be done to the new version to bring it closer to reproducing the old version.

* CSS gradients on the buttons, so they look as textured and nice as those on the original images.


## APIs

* [Runtime](http://developer.chrome.com/trunk/apps/app.runtime.html)
* [Window](http://developer.chrome.com/trunk/apps/app.window.html)

