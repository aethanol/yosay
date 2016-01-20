'use strict';
// "Terminal string styling done right" Chalk is a node module that allows color and other text formatting 
// for output to the console
var chalk = require('chalk');
// "Trims string whitespace"
var pad = require('pad-component');
// "Wrap strings to a specified length""
var wrap = require('word-wrap');
// "Get the visual width of a string - the number of columns required to display it"
var stringWidth = require('string-width');
// "Strip ANSI escape codes" Invisible ANSI codes will break the output probably
var stripAnsi = require('strip-ansi');
// "ANSI escape codes for styling strings in the terminal" This is a module in chalk to directly deal with ansi stylings
var ansiStyles = require('ansi-styles');
// "Regular expression for matching ANSI escape codes " This is a module in chalk to compare ANSI escape codes
var ansiRegex = require('ansi-regex')();

var repeating = require('repeating');

var topOffset = 3;
var leftOffset = 17;

// default yeoman ASCII art
var defaultGreeting =
  '\n     _-----_' +
  '\n    |       |    ' +
  '\n    |' + chalk.red('--(o)--') + '|    ' +
  '\n   `---------´   ' +
  '\n    ' + chalk.yellow('(') + ' _' + chalk.yellow('´U`') + '_ ' + chalk.yellow(')') + '    ' +
  '\n    /___A___\\    ' +
  '\n     ' + chalk.yellow('|  ~  |') + '     ' +
  '\n   __' + chalk.yellow('\'.___.\'') + '__   ' +
  '\n ´   ' + chalk.red('`  |') + '° ' + chalk.red('´ Y') + ' ` ';

/**
 * Like cowsay, but less cow. Generates an ASCII yeoman with a message.
 * Yosay creates a duplicate of a passed string and removes all ansi styling.
 * With this, the true length of the message string is available to `pad` and 
 * `wrap` so they are able to properly parse the string. Additionally, the 
 * character position of the ansi styling is stored so when the string is 
 * printed in the message box yoman re-inserts any needed asci styling.
 * 
 * @param message The message string that you want yeoman to say
 * @param options 
 * @returns wrap 
 * 
 */
module.exports = function (message, options) {
  message = (message || 'Welcome to Yeoman, ladies and gentlemen!').trim();
  options = options || {};

  /*
   * What you're about to see may confuse you. And rightfully so. Here's an
   * explanation.
   *
   * When yosay is given a string, we create a duplicate with the ansi styling
   * sucked out. This way, the true length of the string is read by `pad` and
   * `wrap`, so they can correctly do their job without getting tripped up by
   * the "invisible" ansi. Along with the duplicated, non-ansi string, we store
   * the character position of where the ansi was, so that when we go back over
   * each line that will be printed out in the message box, we check the
   * character position to see if it needs any styling, then re-insert it if
   * necessary.
   *
   * Better implementations welcome :)
   */
  
  // default wrapping length
  var maxLength = 24;
  var frame;
  var styledIndexes = {};
  var completedString = '';
  var regExNewLine;
  
  //change wrapping length if user specified in options param eg. {maxLength:100}
  if (options.maxLength) {
    maxLength = stripAnsi(message).toLowerCase().split(' ').sort()[0].length;

    //update local var maxLength
    if (maxLength < options.maxLength) {
      maxLength = options.maxLength;
    }
  }
  
  // new regular expression to match the next whitespace in any maxLength
  regExNewLine = new RegExp('\\s{' + maxLength + '}');
  
  // create the frame of given maxLength using repeating like so:
  // .------------------------.
  // |       TEST TEXT        |
  // '------------------------'
  frame = {
    top: '.' + repeating('-', maxLength + 2) + '.',
    side: ansiStyles.reset.open + '|' + ansiStyles.reset.open,
    bottom: ansiStyles.reset.open + '\'' + repeating('-', maxLength + 2) + '\''
  };
  
  // Store ansi for later restyling
  // forEach ansi given by `ansi-regex`
  message.replace(ansiRegex, function (match, offset) {
    Object.keys(styledIndexes).forEach(function (key) {
      offset -= styledIndexes[key].length;
    });
    
    styledIndexes[offset] = styledIndexes[offset] ? styledIndexes[offset] + match : match;
  });

  // return wrapped string by using `word-wrap` on ansi stripped message with maxLength
  return wrap(stripAnsi(message), { width: maxLength })
  // split by newline into array
    .split(/\n/)
    // then reduce the array of strings to one string which will be restyled in final return
    // param as initialValue, currentValue, currentIndex, array (that was created by .split())
    .reduce(function (greeting, str, index, array) {
      // string to add whitespace 
      var paddedString;
      
      // trim whitespace if the currentValue is not registerd character newline
      if (!regExNewLine.test(str)) {
        str = str.trim();
      }
      
      
      // add that line to the local completedString
      completedString += str;
      
      // find and replace where each ansi was at location
      str = completedString
        .substr(completedString.length - str.length)
        .replace(/./g, function (char, charIndex) {
          
          // increment the idex to what we have processed
          if (index > 0) {
            charIndex += completedString.length - str.length + index;
          }
          
          // counter for if there are consecutive characters of ansi styling
          var hasContinuedStyle = 0;
          // stroe consecutive ansi styling string
          var continuedStyle;
          
          // iterate through each key of the ansi styling object
          Object.keys(styledIndexes).forEach(function (offset) {
            if (charIndex > offset) {
              hasContinuedStyle++;
              continuedStyle = styledIndexes[offset];
            }

            if (hasContinuedStyle === 1 && charIndex < offset) {
              hasContinuedStyle++;
            }
          });
          
          //check the object of ansi styling to see if that character needs styling
          if (styledIndexes[charIndex]) {
            return styledIndexes[charIndex] + char;
            // if the ansi needs style for more than two consecutive char add to the continued styling
          } else if (hasContinuedStyle >= 2) {
            return continuedStyle + char;
          } else {
            return char;
          }
        })
        .trim();
      
      // use `pad-component` to add whitespace to center the strings to the frame
      paddedString = pad({
        length: stringWidth(str),
        valueOf: function () {
          return ansiStyles.reset.open + str + ansiStyles.reset.open;
        }
      }, maxLength);
      
      // if at the first pass of the string array 
      if (index === 0) {
        greeting[topOffset - 1] += frame.top;
      }
      
      greeting[index + topOffset] =
        (greeting[index + topOffset] || pad.left('', leftOffset)) +
        frame.side + ' ' + paddedString + ' ' + frame.side;

      if (array.length === index + 1) {
        greeting[index + topOffset + 1] =
          (greeting[index + topOffset + 1] || pad.left('', leftOffset)) +
          frame.bottom;
      }

      return greeting;
    }, defaultGreeting.split(/\n/))
    .join('\n') + '\n';
};
