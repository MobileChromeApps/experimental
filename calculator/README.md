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


## APIs

* [Runtime](http://developer.chrome.com/trunk/apps/app.runtime.html)
* [Window](http://developer.chrome.com/trunk/apps/app.window.html)

