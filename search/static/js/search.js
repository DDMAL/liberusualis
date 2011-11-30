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
            boxes: [],                  // Array of boxes etc
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

        // Give it the index of the pagethat needs a box and it will append it
        // Index of the page in pagesArray ... not the actual page number or anything
        var appendBox = function(boxID) {
            // First make sure the pageID is in range
            if (!inRange(boxID)) {
                return false;
            }
            
            // And make sure the box has not already been appended
            if (boxExists(boxID)) {
                return false;
            }

            var thisBox = settings.boxes[boxID];
            var pageNumber = thisBox.p;

            // 2 pixels of padding on either side (temp solution)
            var xStart = thisBox.x - 2;
            var yStart = thisBox.y - 2;
            var width = thisBox.w + 4;
            var height = thisBox.h + 4;


            if (pageExists(pageNumber)) {
                // If this box is the "current box" put the border around it
                var thisClass = (boxID == settings.currentBox) ? ' class="search-box-this"' : '';
                var toAppend = '<div id="search-box-' + boxID + '"' + thisClass + ' style="width: ' + width + '; height: ' + height + '; left: ' + xStart + '; top: ' + yStart + ';"><div class="' + settings.highlightColour + ' search-box-inner"></div></div>';
                $('#1-diva-page-' + (pageNumber-1)).append(toAppend);
                // Figure out if we need to update the first/last pages loaded
                if (boxID > settings.lastBoxLoaded) {
                    settings.lastBoxLoaded = boxID;
                }
                if (boxID < settings.firstBoxLoaded || settings.firstBoxLoaded === -1) {
                    settings.firstBoxLoaded = boxID;
                }
                // Might as well put it here too
                handleSearchButtons();
                return true;
            } else {
                return false;
            }
    
            // Return true if it is able to append it
            // False if it is not
        };

        var loadBoxes = function() {
            updateStatus("Loading results");
            var ajaxURL = '/query/' + settings.query_type + '/' + settings.query + '/' + settings.zoomLevel;
            $.ajax({
                url: ajaxURL,
                dataType: 'json',
                success: function(data) {
                    // First clear the last search (if there was one)
                    clearResults();

                    // Now make the clear button clickable
                    $('#search-clear').attr('disabled', false);
                    settings.boxes = data;
                    settings.numBoxes = data.length;

                    // Stop trying to do stuff if there are 0 results
                    if (settings.numBoxes == 0) {
                        updateStatus("No results for " + settings.query);
                        return;
                    }

                    updateStatus("Result <span></span> of " + settings.numBoxes + " for " + settings.query);


                    var numAppended = 0;
                    for (i = 0; i < settings.numBoxes; i++) {
                        // Try to append the box no matter what
                        if (appendBox(i)) {
                            // The next up should be the first one appended - 1
                            if (settings.nextUp == -1) {
                                settings.nextUp = i - 1;
                                // If i = 0 it just stays the same whatever
                            }

                            // Gets overriden each time - starts at 0
                            settings.nextDown = i + 1;
                            numAppended++;
                        }
                    }

                    // If there's nothing to append, figure out where in the search results we are
                    // Possibilities: all are above, all are below, some are above and some are below
                    if (numAppended == 0) {
                        var currentPage = settings.diva.getCurrentPage();
                        var lastPage = settings.boxes[settings.numBoxes-1].p;
                        var firstPage = settings.boxes[0].p;

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
                                var thisBoxPage = settings.boxes[i].p;

                                // Find the index of the page right after the current page
                                if (thisBoxPage > currentPage) {
                                    settings.nextDown = i;
                                    settings.nextUp = i - 1;
                                    break;
                                }
                            }
                        }
                    }
                    // Jump to the first result OR the result specified in the URL
                    if (settings.firstRequest) {
                        desiredResult = parseInt($.getHashParam('result'), 10);
                        if (desiredResult === NaN || !inRange(desiredResult - 1)) {
                            jumpToBox(1);
                        } else {
                            jumpToBox(desiredResult);
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
            settings.boxes= [];
            settings.numBoxes = 0;
            $('#search-next').attr('disabled', 'disabled');
            $('#search-prev').attr('disabled', 'disabled');
        };

        var jumpToBox = function(direction) {
            var desiredBox = settings.currentBox + direction;

            // Now figure out the page that box is on
            var desiredPage = settings.boxes[desiredBox].p;
            // Now jump to that page
            settings.diva.gotoPage(desiredPage);
            // Get the height above top for that box
            var boxTop = settings.boxes[desiredBox].y;
            var currentScrollTop = parseInt($('#1-diva-outer').scrollTop(), 10);
            // +250 pixels just to center it a bit or whatever
            $('#1-diva-outer').scrollTop(boxTop + currentScrollTop - 250);
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
            $.updateHashParam('result', desiredBox + 1);
        }

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

        this.handleZoom = function(newZoomLevel) {
            // New ajax request, set the zoom level
            settings.zoomLevel = newZoomLevel;
            // Only if we're already in a search mode
            if (!$('#search-clear').attr('disabled')) {
                loadBoxes();
            }

            // IF THERE IS A RESULT # IN THE URL DELETE IT!!!!!!!!
            $.removeHashParam('result');
        }

        this.handleDownScroll = function(newCurrentPage) {
            // Only do anything if we're in search mode
            if (!$('#search-clear').attr('disabled')) {
                // Try to show the next box
                // Check if the first box loaded needs to be updated
                while (inRange(settings.nextDown)) {
                    var nextPage = settings.boxes[settings.nextDown].p;
                    if (pageExists(nextPage) || nextPage <= newCurrentPage) {
                        appendBox(settings.nextDown);
                        settings.nextDown++;
                    } else {
                        break;
                    }
                }

                while (inRange(settings.nextUp+1)) {
                    // Handle updating nextUp - check if the next up + 1 page is above the current page
                    var prevPage = settings.boxes[settings.nextUp+1].p;
                    if (prevPage <= newCurrentPage) {
                        settings.nextUp++;
                    } else {
                        break;
                    }
                }

                handleSearchButtons();
            }
        };

        this.handleUpScroll = function(newCurrentPage) {
            // Only do anything if we're in search mode
            if (!$('#search-clear').attr('disabled')) {
                while (inRange(settings.nextUp)) {
                    var nextPage = settings.boxes[settings.nextUp].p;
                    if (pageExists(nextPage) || nextPage > newCurrentPage) {
                        appendBox(settings.nextUp);
                        settings.nextUp--;
                    } else {
                        break;
                    }
                }

                while (inRange(settings.nextDown-1)) {
                    var prevPage = settings.boxes[settings.nextDown-1].p;
                    if (prevPage > newCurrentPage) {
                        settings.nextDown--;
                    } else {
                        break;
                    }
                }
                handleSearchButtons();
            }
        };

        this.setZoomLevel = function(newZoomLevel) {
            settings.zoomLevel = newZoomLevel;
        };

        // The searchbar that appears at the top in fullscreen mode
        this.createSearchbar = function() {
            $('body').append('<div id="search-bar" class="ui-widget ui-widget-content ui-corner-all ui-state-highlight"></div>');
            $('#search-bar').append($('#search-input').remove());
            $('#search-bar').append($('#search-controls').remove());
            handleEvents();

            // Some widths need to be adjusted for the iPad
            if (navigator.platform == 'iPad') {
                $('#search-bar').css('width', '768px').css('margin-left', '-384px').css('height', '100px');
                $('#search-query').css('width', '170px');
            }

        };

        this.destroySearchbar = function() {
            $('#search-wrapper').append($('#search-input').remove());
            $('#search-wrapper').append($('#search-controls').remove());
            $('#search-bar').remove();
            handleEvents(); // alternative to using live()
        }

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
                jumpToBox(1);
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
        }

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
        }

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
