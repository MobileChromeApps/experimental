var scripts = document.getElementsByTagName('script');
var platform = navigator.userAgent.indexOf('Android') >= 0 ? 'android' : 'ios';
var cordovaPath = scripts[scripts.length - 1].src.replace('cordova.js', 'cordova.' + platform + '.js');

document.write('<script type="text/javascript" charset="utf-8" src="' + cordovaPath + '"></script>');
