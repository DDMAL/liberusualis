//credit to http://stackoverflow.com/a/21963136
var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
function genUUID()
{
  var d0 = Math.random()*0xffffffff|0;
  var d1 = Math.random()*0xffffffff|0;
  var d2 = Math.random()*0xffffffff|0;
  var d3 = Math.random()*0xffffffff|0;
  return 'm-' + lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
    lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
    lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
    lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
}

(function( $ ) {
    var Search = function(element, options) {
        // These are elements that can be overridden
        var defaults = {
            highlightColour: 'colour-yellow'
        };

        var settings = $.extend({}, defaults, options);

        // Cannot be changed
        var globals = {
            firstPage: 0,              // The first page included in query (currentpage-20ish)
            firstRequest: true,         // For each query
            lastPage: 0,               // The last page included in query (currentpage+20ish)
            query: '',                  // The search query, saved in ajaxRequest()
            queryType: '',              // The type - text, pnames, etc
            diva: null,                 // The object reference
            elementSelector: '',        // Set in init(); the ID of the element plus '#'
            boxes: {},                  // Array of boxes etc
            numBoxes: 0,                // Set to pages.length after the first JSON response
            nextUp:  -1,
            nextDown: 0,
            oldBox: 0,
            currentBox: -1,
            zoomLevel: 0               // Set to the current zoom level of the document viewer
        };

        $.extend(settings, globals);

        var inRange = function(boxID) {
            if (boxID >= 0 && boxID < settings.numBoxes) {
                return true;
            } else {
                return false;
            }
        };
        
        // Check if a page is visible in the dom
        var pageExists = function(pageNumber) {
            var pageIndex = pageNumber - 1;
            if ($('#1-diva-page-' + pageIndex).length > 0) {
                return true;
            } else {
                return false;
            }
        };

        var boxExists = function(boxIndex) {
            if ($('#search-box-' + boxIndex).length > 0) {
                return true;
            } else {
                return false;
            }
        };

        var loadBoxes = function() {
            updateStatus("Loading results");
            //the 4 in the ajaxURL is the max zoom level * 2. Leaving this as a magic number until I can fix Solr
            var ajaxURL = '/query/' + settings.query_type + '/' + settings.query;
            $.ajax({
                url: ajaxURL,
                dataType: 'json',
                success: function(data) {
                    // First clear the last search (if there was one)
                    clearResults();

                    // Now make the clear button clickable
                    $('#search-clear').attr('disabled', false);
                    settings.boxes = {};
                    var boxes = data;
                    settings.numBoxes = data.length;

                    // Stop trying to do stuff if there are 0 results
                    if (settings.numBoxes === 0) {
                        updateStatus("No results for " + settings.query);
                        return;
                    }

                    updateStatus("Result <span></span> of " + settings.numBoxes + " for " + settings.query);

                    var pageIndexes = [];
                    var regions = [];
                    for (idx in data)
                    {
                        var curBox = data[idx];
                        var pIindex = pageIndexes.indexOf(curBox['p'] - 1);
                        var boxID = curBox['id'] || genUUID();
                        var dimensionsArr = {'width': curBox['w'], 'height': curBox['h'], 'ulx': curBox['x'], 'uly': curBox['y'], 'divID': boxID};
                        settings.boxes[boxID] = dimensionsArr;
                        curBox.UUID = boxID;

                        if (pIindex == -1) 
                        {
                            pageIndexes.push(curBox['p'] - 1);
                            regions.push([dimensionsArr]);
                        }
                        else
                        {
                            regions[pIindex].push(dimensionsArr);
                        }
                    }

                    settings.diva.resetHighlights();
                    settings.diva.highlightOnPages(pageIndexes, regions, undefined, 'search-box');
                    
                    var currentPage = settings.diva.getCurrentPageIndex();
                    var lastPage = boxes[settings.numBoxes-1].p;
                    var firstPage = boxes[0].p;

                    if (currentPage > lastPage) {
                        // We're below all the boxes
                        settings.nextDown = settings.numBoxes;
                        settings.nextUp = settings.numBoxes - 1;
                    } else if (currentPage < firstPage) {
                        // We're above all the boxes
                        settings.nextDown = 0;
                        settings.nextUp = -1;
                    } else {
                        // Some are above, some are below
                        // Go through all the page numbers, figuring out where we are
                        for (i = 0; i < settings.numBoxes; i++) {
                            var thisBoxPage = boxes[i].p;

                            // Find the index of the page right after the current page
                            if (thisBoxPage > currentPage) {
                                settings.nextDown = i;
                                settings.nextUp = i - 1;
                                break;
                            }
                        }
                    }

                    // Jump to the first result OR the result specified in the URL
                    if (settings.firstRequest) {
                        desiredResult = parseInt($.getHashParam('result'), 10);
                        var result;
                        if (desiredResult === NaN || !inRange(desiredResult - 1)) {
                            result = settings.diva.gotoHighlight(boxes[0].UUID);
                        } else {
                            result = settings.diva.gotoHighlight(boxes[desiredResult].UUID);
                        }
                        if (!result) {
                            updateStatus("Invalid URL - can't find the sequence you asked for.");
                        }
                        settings.firstRequest = false;
                    } else {
                        settings.currentBox = settings.oldBox;
                        // Pretend we're still on the same box
                        updateStatus('', settings.oldBox + 1);
                        // Highlight that box
                        $('#search-box-' + settings.oldBox).addClass('search-box-this');
                    }

                    handleSearchButtons();
                },
                error: function() {
                    // The server will return a 404 if the query is invalid
                    updateStatus("Invalid query");
                }
            });
        };

        var handleSearchButtons = function() {
            var prevDisabled = $('#search-prev').attr('disabled');
            var nextDisabled = $('#search-next').attr('disabled');

            if (!inRange(settings.currentBox-1) && !prevDisabled) {
                $('#search-prev').attr('disabled', 'disabled');
            }

            if (inRange(settings.currentBox-1) && prevDisabled) {
                $('#search-prev').removeAttr('disabled');
            }

            if (!inRange(settings.currentBox+1) && !nextDisabled) {
                $('#search-next').attr('disabled', 'disabled');
            }

            if (inRange(settings.currentBox+1) && nextDisabled) {
                $('#search-next').removeAttr('disabled');
            }
        };

        // Called initially as well - sets it to no results etc
        var clearResults = function() {
            $('[id^=search-box-]').remove();
            settings.nextUp = -1;
            settings.nextDown = 0;
            settings.oldBox = settings.currentBox;
            settings.currentBox = -1;
            $('#search-clear').attr('disabled', 'disabled');
            settings.boxes = {};
            settings.numBoxes = 0;
            $('#search-next').attr('disabled', 'disabled');
            $('#search-prev').attr('disabled', 'disabled');
        };

        var jumpToBox = function(direction) {
            /*var desiredBox = settings.currentBox + direction;

            // Now figure out the page that box is on
            var desiredPage = settings.boxes[desiredBox].p;

            settings.diva.gotoPageByNumber(desiredPage, 'top', 'center');
            // Get the height above top for that box
            var boxTop = settings.boxes[desiredBox].y;
            console.log(boxTop);
            //var currentScrollTop = parseInt($('#1-diva-outer').scrollTop(), 10);
            // +250 pixels just to center it a bit or whatever
            //$('#1-diva-outer').scrollTop(boxTop + currentScrollTop - 250);
            // Now get the horizontal scroll
            var boxLeft = settings.boxes[desiredBox].x;
            $('#1-diva-outer').scrollLeft(boxLeft);
            // Will include the padding between pages for best results

            // Make the border change etc
            $('div[id^="search-box-"]').removeClass('search-box-this');
            $('#search-box-' + desiredBox).addClass('search-box-this');

            // For the box number, not the box index
            updateStatus('', desiredBox + 1);
            settings.currentBox = desiredBox;
            handleSearchButtons();
            $.updateHashParam('result', desiredBox + 1);*/
        };

        this.setDocumentViewer = function(diva) {
            settings.diva = diva;

            // This is stupid but it has to be done after this otherwise, problems
            // Check for hash params
            var type = $.getHashParam('type');
            var query = $.getHashParam('query');
            if (type == 'pnames' || type == 'pnames-invariant' || type == 'neumes' || type == 'text' || type == 'contour' || type == 'intervals' || type == "incipit") {
               settings.query = query;
               settings.query_type = type;

               // Update the input boxes
               $('#search-query').val(query);
               // Have to get the actual text, not just the value, hence the hack
               $('#search-type').val($('option[name="' + type + '"]').text());
               loadBoxes();
            }
        };

        diva.Events.subscribe("ModeDidSwitch", function(inFullscreen)
        {
            if (inFullscreen)
            {
            // The searchbar that appears at the top in fullscreen mode
                $('body').append('<div id="search-bar" class="ui-widget ui-widget-content ui-corner-all ui-state-highlight"></div>');
                $('#search-bar').append($('#search-input').remove());
                $('#search-bar').append($('#search-controls').remove());
                handleEvents();

                // Some widths need to be adjusted for the iPad
                if (navigator.platform == 'iPad') {
                    $('#search-bar').css('width', '768px').css('margin-left', '-384px').css('height', '100px');
                    $('#search-query').css('width', '170px');
                }
            }

            else
            {
                $('#search-wrapper').append($('#search-input').remove());
                $('#search-wrapper').append($('#search-controls').remove());
                $('#search-bar').remove();
                handleEvents(); // alternative to using live()
            }
        });

        // Called when a user clicks a colour
        var handleColourChange = function(newColour) {
            // Now change the colour of any existing boxes
            $('div[id^=search-box-] > div').removeClass(settings.highlightColour).addClass(newColour);

            // Make the old colour look not selected
            $('.' + settings.highlightColour).removeClass('selected');
            // And make the new one look selected
            $('.' + newColour).addClass('selected');

            settings.highlightColour = newColour;
        };

        var handleEvents = function() {
            // Now handle the search box clicking
            $('#search-input').submit(function() {
                settings.query = $('#search-query').val();
                settings.query_type = $('#search-type option:selected').attr('name');
                settings.firstRequest = true;
                
                // Update the hash params in the URL
                $.updateHashParam('type', settings.query_type);
                $.updateHashParam('query', settings.query);
                $.updateHashParam('result', 1);

                loadBoxes();

                // Return false to prevent the form submission from being handled
                return false;
            });

            // Handle the clearing of search results
            $('#search-clear').click(function() {
                // Make the search input box empty
                $('#search-query').val('');

                // Remove all the hash params
                $.removeHashParam('result');
                $.removeHashParam('query');
                $.removeHashParam('type');
                updateStatus();
                clearResults();
            });

            // Now handle the colour selection
            $('#search-colours li').click(function() {
                // Only do something if the user is selecting a different colour
                var isSelected = $(this).hasClass('selected');
                if (!isSelected) {
                    var newColour = $(this).attr('class');
                    handleColourChange(newColour);
                }
            });

            // Handle clicking the prev / next buttons
            $('#search-prev').click(function() {
                jumpToBox(-1);
            });

            $('#search-next').click(function() {
                settings.diva.gotoNextHighlight();
            });
        };
        
        var updateStatus = function(message, boxNumber) {
            if (boxNumber) {
                $('#search-status span').text(boxNumber);
                return;
            }
            if (!message) {
                // Display the default message (we're not in search)
                $('#search-status').text('Enter a search query');
            } else {
                $('#search-status').html(message);
            }
        };

        var init = function() {
            settings.elementSelector = '#' + $(element).attr('id');
            
            // Now create all the divs and such
            $(settings.elementSelector).append('<form id="search-input"><input type="text" id="search-query" size="25" /><select id="search-type" name="search-type"><option name="neumes">Neumes</option><option name="pnames" selected="selected">Strict pitch sequence</option><option name="pnames-invariant">Transposed pitch sequence</option><option name="contour">Contour</option><option name="intervals">Intervals</option><option name="text">Text</option><option name="incipit">Incipit</option></select><input type="submit" id="search-go" value="Search" /><input type="button" id="search-clear" value="Clear" disabled="disabled" /><ul id="search-colours"><li class="colour-red"></li><li class="colour-orange"></li><li class="colour-yellow"></li><li class="colour-green"></li><li class="colour-blue"></li><li class="colour-purple"></li></ul></form>');
            $(settings.elementSelector).append('<div id="search-controls"><input type="button" id="search-prev" value="previous" disabled="disabled" /><div id="search-status"></div><input type="button" id="search-next" value="next" disabled="disabled" /></div>');
            // Make the default colour selected
            $('.' + settings.highlightColour).addClass('selected');

            handleEvents();

            // Make the status display the default message
            updateStatus();
        };

        init();
    };

    $.fn.search = function(options) {
        return this.each(function() {
            var element = $(this);
            // Return early blah blah

            if (element.data('search')) {
                return;
            }

            var search = new Search(this, options);
            element.data('search', search);
        });
    };

})( jQuery );
