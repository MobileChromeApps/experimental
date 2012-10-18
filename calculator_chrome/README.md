# Calculator

A sample application that provides a simple calculator. Supports basic operations
such as addition, multiplication, subtraction and division.

This sample also incorporates an MVC-style structure and requires jQuery for
DOM manipulation.

## Mobile Changes and Comments

This version of the calculator is changed to work nicely on mobile (and hopefully desktop as well). Here's a list of the changes I had to make.

* I removed min/max Width/Height from main.js for testing on desktop by resizing the window, but that isn't necessary for mobile, which just ignores the size.
* The use of images for the calculator buttons makes resizing them impossible. I replaced them with appropriately styled table cells. This was the most complex change I had to make.
    * Had to remove several pieces of CSS hardcoded with the size of the window. The fixed size of the calculator popup was absolutely baked deeply into this code.
* The `overflow: scroll` was problematic because it requires a fixed height. I ended up using `position: absolute` for both the calculator display and the buttons, setting `top`, `bottom`, `left` and `right` instead of `padding`. Then the `overflow: scroll` started working.
* I used the same trick as mobile-spec to have a cordova.js that adds a `<script>` tag to the document for either `cordova.android.js` or `cordova.ios.js` depending on `navigator.userAgent.indexOf('Android')`. A similar hack may prove necessary to add platform-specific CSS.


## APIs

* [Runtime](http://developer.chrome.com/trunk/apps/app.runtime.html)
* [Window](http://developer.chrome.com/trunk/apps/app.window.html)

