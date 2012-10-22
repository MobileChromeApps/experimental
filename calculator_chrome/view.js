var operators = ['+', '-', '/', '*'];

var values = { '1'   : 1,
               '2'   : 2,
               '3' : 3,
               '4'  : 4,
               '5'  : 5,
               '6'   : 6,
               '7' : 7,
               '8' : 8,
               '9'  : 9,
               '0'  : 0,
               '+'  : '+',
               '&minus;' : '-',
               '&divide;'   : '/',
               '&times;'  : '*',
               '=': '=',
               '.' : '.',
               'AC'    : 'AC',
               '&plusmn;' : '+ / -'
              }

var keyboard = { 49 : 1,
                 50 : 2,
                 51 : 3,
                 52 : 4,
                 53 : 5,
                 54 : 6,
                 55 : 7,
                 56 : 8,
                 57 : 9,
                 48 : 0,
                 187 : '=',
                 13 : '=',
                 190 : '.',
                 189 : '-',
                 191 : '/',
                 67 : 'AC',
                 8 : 'back'
              };
var shiftKeyboard = { 187 : '+',
                      56 : '*'
                    };

var shift = false;

function View(calcModel) {
  this.calcElement = $('#calc');
  this.buttonsElement = $('#buttons');
  this.displayElement = $('#display');
  this.lastDisplayElement = null;
  this.model = calcModel;
  this.BuildWidgets();
  var calc = this;

  $(document).keydown(function(event) {
    var clicked = null;
    if (event.which == 16)
      shift = true;
    else if (shift && event.which in shiftKeyboard)
      clicked = shiftKeyboard[event.which]
    else if (!shift && event.which in keyboard)
      clicked = keyboard[event.which]
    if (clicked != null) {
      var result = calcModel.HandleButtonClick(clicked);
      calc.buttonClicked(clicked, result);
    }
  });

  $(document).keyup(function(event) {
    if (event.which == 16)
      shift = false;
  });

}


function displayNumber(number) {
  var digits = (number + '').length;
  if ((number >= 0 && digits > 8) || (number < 0 && digits > 9)) {
    if (number % 1 != 0) {
      number = parseFloat((number + '').slice(0, 8));
      if (number % 1 != 0) return number;
    }
    var pow = (number + '').length - 1;
    var extra_length = (pow + '').length + 2;
    number = number * Math.pow(10, -1*pow);
    number = (number + '').slice(0, 8 - extra_length) + 'e' + pow;
  }
  return number;
}

View.prototype.buttonClicked = function(clicked, result) {
  var operator = result[0];
  var operand = displayNumber(result[1]);
  var accumulator = displayNumber(result[2]);
  if (clicked == 'AC') {
    this.displayElement.text('');
    this.AddDisplayEquation('', 0, '');
  }
  else if (clicked == 'back' && operator == 'back') {
    this.UpdateDisplayEquation('', '', '');
  }
  else if (operators.indexOf(clicked) != -1) {
    if (this.lastDisplayElement)
      this.UpdateTotal(accumulator);
    operand = '';
    accumulator = '';
    this.AddDisplayEquation(operator, operand, accumulator);
  }
  else if (clicked == '=') {
    this.displayElement.append('<div class="hr"></div>');
    this.AddDisplayEquation('', accumulator, accumulator);
    this.lastDisplayElement = null;
  }
  else if (clicked == '+ / -') {
    this.UpdateDisplayEquation(operator, operand, '');
  }
  else if (this.lastDisplayElement) {
    accumulator = '';
    this.UpdateDisplayEquation(operator, operand, accumulator);
  }
  else {
    accumulator = '';
    operator = '';
    this.AddDisplayEquation(operator, operand, accumulator)
  }
}

View.prototype.BuildWidgets = function() {
  this.AddButtons();
  this.AddDisplayEquation('', 0, '');
}

View.prototype.UpdateTotal = function(accumulator) {
  $(this.lastDisplayElement).children('.accumulator').text(accumulator);
}

View.prototype.AddDisplayEquation = function(operator, operand, accumulator) {
  this.displayElement.append(
      '<div class="equation">'
      + '<div class="operand">' + operand + '</div>'
      + '<div class="operator">' + operator + '</div>'
      + '<div class="accumulator">' + accumulator + '</div'
      + '</div>');
  this.lastDisplayElement = $('.equation').last();
  this.displayElement.scrollTop(this.displayElement[0].scrollHeight);
}

View.prototype.UpdateDisplayEquation = function(operator, operand, accumulator) {
  $(this.lastDisplayElement).children('.operator').text(operator);
  $(this.lastDisplayElement).children('.operand').text(operand);
  $(this.lastDisplayElement).children('.accumulator').text(accumulator);
  this.displayElement.scrollTop(this.displayElement[0].scrollHeight);
}

View.prototype.AddButtons = function() {
  var row;

  row = this.AddRow();
  this.AddButton(row, 'AC');
  this.AddButton(row, '&plusmn;', { css: 'symbol' });
  this.AddButton(row, '&divide;', { css: 'symbol' });
  this.AddButton(row, '&times;', { css: 'symbol' });

  row = this.AddRow();
  this.AddButton(row, '7');
  this.AddButton(row, '8');
  this.AddButton(row, '9');
  this.AddButton(row, '&minus;', { css: 'symbol' });

  row = this.AddRow();
  this.AddButton(row, '4');
  this.AddButton(row, '5');
  this.AddButton(row, '6');
  this.AddButton(row, '+', { css: 'symbol' });

  row = this.AddRow();
  this.AddButton(row, '1');
  this.AddButton(row, '2');
  this.AddButton(row, '3');
  this.AddButton(row, '=', { rowspan: 2, css: 'equals symbol' });

  row = this.AddRow();
  this.AddButton(row, '0', { colspan: 2 });
  this.AddButton(row, '.', { css: 'symbol' })
}

View.prototype.AddRow = function() {
  var row = $('<tr/>');
  this.buttonsElement.append(row);
  return row;
}

View.prototype.AddButton = function(row, value, options) {
  var colspan = options && options.colspan ? ' colspan=' + options.colspan : '';
  var rowspan = options && options.rowspan ? ' rowspan=' + options.rowspan : '';
  var classes = options && options.css     ? ' ' + options.css : '';
  var button = $('<td class="calc-button' + classes + '"' + rowspan + colspan + '>' + value + '</td>');
  var self = this;
  button.click(function() {
      var clicked = values[value];
      var result = self.model.HandleButtonClick(clicked);
      self.buttonClicked(clicked, result);
  });
  row.append(button);
}
