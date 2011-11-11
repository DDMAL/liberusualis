// from http://forrst.com/posts/jQuery_element_ID_generator-RoM
(function( $ ) {
    var counter = 1;
    $.generateId = function(suffix) {
        var generatedId;
        do {
          generatedId = (counter++) + (suffix ? '-' + suffix : '');
        } while(document.getElementById(generatedId));
        
        return generatedId;
    };
})( jQuery );

// For executing callback functions with one parameter (maybe allow more later)
(function( $ ) {
    $.executeCallback = function(callback, parameter) {
        // If it's not a function, it just won't execute it
        if (typeof callback == 'function') {
            callback.call(this, parameter);
            return true;
        } else {
            return false;
        }
    };
})( jQuery );

// For getting the #key values from the URL. For specifying a page and zoom level
// Look into caching, because we only need to get this during the initial load
// Although for the tests I guess we would need to override caching somehow
(function( $ ) {
    $.getHashParam = function(key) {
        var hash = window.location.hash;
        if (hash != '') {
            // Check if there is something that looks like either &key= or #key=
            var startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');

            // If startIndex is still -1, it means it can't find either
            if (startIndex >= 0) {
                // Add the length of the key plus the & and =
                startIndex += key.length + 2;

                // Either to the next ampersand or to the end of the string
                var endIndex = hash.indexOf('&', startIndex);
                if (endIndex > startIndex) {
                    return hash.substring(startIndex, endIndex);
                } else if (endIndex < 0) {
                    // This means this hash param is the last one
                    return hash.substring(startIndex);
                } 
                // If the key doesn't have a value I think
                return '';
            } else {
                // If it can't find the key
                return false;
            }
        } else {
            // If there are no hash params just return false
            return false;
        }
    };
})( jQuery );

(function( $ ) {
    $.updateHashParam = function(key, value) {
        // First make sure that we have to do any work at all
        var originalValue = $.getHashParam(key);
        var hash = window.location.hash;
        if (originalValue !== value) {
            // Is the key already in the URL?
            if (typeof originalValue == 'string') {
                // Already in the URL. Just get rid of the original value
                var startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');
                var endIndex = startIndex + key.length + 2 + originalValue.length;
                // # if it's the first, & otherwise
                var startThing = (startIndex == 0) ? '#' : '&';
                window.location.hash = hash.substring(0, startIndex) + startThing + key + '=' + value + hash.substring(endIndex);
            } else {
                // It's not present - add it
                if (hash.length === 0) {
                    window.location.hash = '#' + key + '=' + value;
                } else {
                    // Append it
                    window.location.hash += '&' + key + '=' + value;
                }
            }
        }
    };
})( jQuery );

(function( $ ) {
    $.removeHashParam = function(key) {
        // First make sure it's there
        var originalValue = $.getHashParam(key);
        var hash = window.location.hash;
        if (typeof originalValue == 'string') {
            var startIndex = (hash.indexOf('&' + key + '=') > 0) ? hash.indexOf('&' + key + '=') : hash.indexOf('#' + key + '=');
            var endIndex = startIndex + key.length + 2 + originalValue.length;
            window.location.hash = hash.substring(0, startIndex) + hash.substring(endIndex);
        }
    }
})( jQuery );

/* iPad one finger scroll from http://forrst.com/posts/jQuery_iPad_one_finger_scroll-B30 */
jQuery.fn.oneFingerScroll = function() {
    var scrollStartPos = 0;
    var scrollStartY;
    var scrollStartX;
    $(this).bind('touchstart', function(event) {
        // jQuery clones events, but only with a limited number of properties for perf reasons. Need the original event to get 'touches'
        var e = event.originalEvent;
        scrollStartY = $(this).scrollTop() + e.touches[0].pageY;
        // Need horizontal scrolling too
        scrollStartX = $(this).scrollLeft() + e.touches[0].pageX;
        e.preventDefault();
    });
    $(this).bind('touchmove', function(event) {
        var e = event.originalEvent;
        $(this).scrollTop(scrollStartY- e.touches[0].pageY);
        $(this).scrollLeft(scrollStartX - e.touches[0].pageX);
        e.preventDefault();
    });
    return this;
};

/*
 * jQuery dragscrollable Plugin
 * version: 1.0 (25-Jun-2009)
 * Copyright (c) 2009 Miquel Herrera
 * http://plugins.jquery.com/project/Dragscrollable
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */
(function($){ // secure $ jQuery alias

/**
 * Adds the ability to manage elements scroll by dragging
 * one or more of its descendant elements. Options parameter
 * allow to specifically select which inner elements will
 * respond to the drag events.
 * 
 * options properties:
 * ------------------------------------------------------------------------     
 *  dragSelector         | jquery selector to apply to each wrapped element 
 *                       | to find which will be the dragging elements. 
 *                       | Defaults to '>:first' which is the first child of 
 *                       | scrollable element
 * ------------------------------------------------------------------------     
 *  acceptPropagatedEvent| Will the dragging element accept propagated 
 *                       | events? default is yes, a propagated mouse event 
 *                       | on a inner element will be accepted and processed.
 *                       | If set to false, only events originated on the
 *                       | draggable elements will be processed.
 * ------------------------------------------------------------------------
 *  preventDefault       | Prevents the event to propagate further effectivey
 *                       | dissabling other default actions. Defaults to true
 * ------------------------------------------------------------------------
 *  
 *  usage examples:
 *
 *  To add the scroll by drag to the element id=viewport when dragging its 
 *  first child accepting any propagated events
 *  $('#viewport').dragscrollable(); 
 *
 *  To add the scroll by drag ability to any element div of class viewport
 *  when dragging its first descendant of class dragMe responding only to
 *  evcents originated on the '.dragMe' elements.
 *  $('div.viewport').dragscrollable({dragSelector:'.dragMe:first',
 *                                    acceptPropagatedEvent: false});
 *
 *  Notice that some 'viewports' could be nested within others but events
 *  would not interfere as acceptPropagatedEvent is set to false.
 *      
 */
$.fn.dragscrollable = function( options ){
   
    var settings = $.extend(
        {   
            dragSelector:'>:first',
            acceptPropagatedEvent: true,
            preventDefault: true
        },options || {});
     
    
    var dragscroll= {
        mouseDownHandler : function(event) {
            // mousedown, left click, check propagation
            if (event.which!=1 ||
                (!event.data.acceptPropagatedEvent && event.target != this)){ 
                return false; 
            }
            
            // Initial coordinates will be the last when dragging
            event.data.lastCoord = {left: event.clientX, top: event.clientY}; 
        
            $.event.add( document, "mouseup", 
                         dragscroll.mouseUpHandler, event.data );
            $.event.add( document, "mousemove", 
                         dragscroll.mouseMoveHandler, event.data );
            if (event.data.preventDefault) {
                event.preventDefault();
                return false;
            }
        },
        mouseMoveHandler : function(event) { // User is dragging
            // How much did the mouse move?
            var delta = {left: (event.clientX - event.data.lastCoord.left),
                         top: (event.clientY - event.data.lastCoord.top)};
            
            // Set the scroll position relative to what ever the scroll is now
            event.data.scrollable.scrollLeft(
                            event.data.scrollable.scrollLeft() - delta.left);
            event.data.scrollable.scrollTop(
                            event.data.scrollable.scrollTop() - delta.top);
            
            // Save where the cursor is
            event.data.lastCoord={left: event.clientX, top: event.clientY};
            if (event.data.preventDefault) {
                event.preventDefault();
                return false;
            }

        },
        mouseUpHandler : function(event) { // Stop scrolling
            $.event.remove( document, "mousemove", dragscroll.mouseMoveHandler);
            $.event.remove( document, "mouseup", dragscroll.mouseUpHandler);
            if (event.data.preventDefault) {
                event.preventDefault();
                return false;
            }
        }
    };
    
    // set up the initial events
    this.each(function() {
        // closure object data for each scrollable element
        var data = {scrollable : $(this),
                    acceptPropagatedEvent : settings.acceptPropagatedEvent,
                    preventDefault : settings.preventDefault };
        // Set mouse initiating event on the desired descendant
        $(this).find(settings.dragSelector).
                        bind('mousedown', data, dragscroll.mouseDownHandler);
    });
}; //end plugin dragscrollable

})( jQuery ); // confine scope

/*
 * jQuery Pines Notify (pnotify) Plugin 1.0.1
 *
 * Copyright (c) 2009 Hunter Perrin
 *
 * Licensed (along with all of Pines) under the GNU Affero GPL:
 *    http://www.gnu.org/licenses/agpl.html
 */

(function($) {
    var history_handle_top, timer;
    var body;
    var jwindow;
    $.extend({
        pnotify_remove_all: function () {
            var body_data = body.data("pnotify");
            /* POA: Added null-check */
            if (body_data && body_data.length) {
                $.each(body_data, function(){
                    if (this.pnotify_remove)
                        this.pnotify_remove();
                });
            }
        },
        pnotify_position_all: function () {
            if (timer)
                clearTimeout(timer);
            timer = null;
            var body_data = body.data("pnotify");
            if (!body_data || !body_data.length)
                return;
            $.each(body_data, function(){
                var s = this.opts.pnotify_stack;
                if (!s) return;
                if (!s.nextpos1)
                    s.nextpos1 = s.firstpos1;
                if (!s.nextpos2)
                    s.nextpos2 = s.firstpos2;
                if (!s.addpos2)
                    s.addpos2 = 0;
                if (this.css("display") != "none") {
                    var curpos1, curpos2;
                    var animate = {};
                    // Calculate the current pos1 value.
                    var csspos1;
                    switch (s.dir1) {
                        case "down":
                            csspos1 = "top";
                            break;
                        case "up":
                            csspos1 = "bottom";
                            break;
                        case "left":
                            csspos1 = "right";
                            break;
                        case "right":
                            csspos1 = "left";
                            break;
                    }
                    curpos1 = parseInt(this.css(csspos1), 10);
                    if (isNaN(curpos1))
                        curpos1 = 0;
                    // Remember the first pos1, so the first visible notice goes there.
                    if (typeof s.firstpos1 == "undefined") {
                        s.firstpos1 = curpos1;
                        s.nextpos1 = s.firstpos1;
                    }
                    // Calculate the current pos2 value.
                    var csspos2;
                    switch (s.dir2) {
                        case "down":
                            csspos2 = "top";
                            break;
                        case "up":
                            csspos2 = "bottom";
                            break;
                        case "left":
                            csspos2 = "right";
                            break;
                        case "right":
                            csspos2 = "left";
                            break;
                    }
                    curpos2 = parseInt(this.css(csspos2), 10);
                    if (isNaN(curpos2))
                        curpos2 = 0;
                    // Remember the first pos2, so the first visible notice goes there.
                    if (typeof s.firstpos2 == "undefined") {
                        s.firstpos2 = curpos2;
                        s.nextpos2 = s.firstpos2;
                    }
                    // Check that it's not beyond the viewport edge.
                    if ((s.dir1 == "down" && s.nextpos1 + this.height() > jwindow.height()) ||
                        (s.dir1 == "up" && s.nextpos1 + this.height() > jwindow.height()) ||
                        (s.dir1 == "left" && s.nextpos1 + this.width() > jwindow.width()) ||
                        (s.dir1 == "right" && s.nextpos1 + this.width() > jwindow.width()) ) {
                        // If it is, it needs to go back to the first pos1, and over on pos2.
                        s.nextpos1 = s.firstpos1;
                        s.nextpos2 += s.addpos2 + 10;
                        s.addpos2 = 0;
                    }
                    // Animate if we're moving on dir2.
                    if (s.animation && s.nextpos2 < curpos2) {
                        switch (s.dir2) {
                            case "down":
                                animate.top = s.nextpos2+"px";
                                break;
                            case "up":
                                animate.bottom = s.nextpos2+"px";
                                break;
                            case "left":
                                animate.right = s.nextpos2+"px";
                                break;
                            case "right":
                                animate.left = s.nextpos2+"px";
                                break;
                        }
                    } else
                        this.css(csspos2, s.nextpos2+"px");
                    // Keep track of the widest/tallest notice in the column/row, so we can push the next column/row.
                    switch (s.dir2) {
                        case "down":
                        case "up":
                            if (this.outerHeight(true) > s.addpos2)
                                s.addpos2 = this.height();
                            break;
                        case "left":
                        case "right":
                            if (this.outerWidth(true) > s.addpos2)
                                s.addpos2 = this.width();
                            break;
                    }
                    // Move the notice on dir1.
                    if (s.nextpos1) {
                        // Animate if we're moving toward the first pos.
                        if (s.animation && (curpos1 > s.nextpos1 || animate.top || animate.bottom || animate.right || animate.left)) {
                            switch (s.dir1) {
                                case "down":
                                    animate.top = s.nextpos1+"px";
                                    break;
                                case "up":
                                    animate.bottom = s.nextpos1+"px";
                                    break;
                                case "left":
                                    animate.right = s.nextpos1+"px";
                                    break;
                                case "right":
                                    animate.left = s.nextpos1+"px";
                                    break;
                            }
                        } else
                            this.css(csspos1, s.nextpos1+"px");
                    }
                    if (animate.top || animate.bottom || animate.right || animate.left)
                        this.animate(animate, {duration: 500, queue: false});
                    // Calculate the next dir1 position.
                    switch (s.dir1) {
                        case "down":
                        case "up":
                            s.nextpos1 += this.height() + 10;
                            break;
                        case "left":
                        case "right":
                            s.nextpos1 += this.width() + 10;
                            break;
                    }
                }
            });
            // Reset the next position data.
            $.each(body_data, function(){
                var s = this.opts.pnotify_stack;
                if (!s) return;
                s.nextpos1 = s.firstpos1;
                s.nextpos2 = s.firstpos2;
                s.addpos2 = 0;
                s.animation = true;
            });
        },
        pnotify: function(options) {
            if (!body)
                body = $("body");
            if (!jwindow)
                jwindow = $(window);

            var animating;
            
            // Build main options.
            var opts;
            if (typeof options != "object") {
                opts = $.extend({}, $.pnotify.defaults);
                opts.pnotify_text = options;
            } else {
                opts = $.extend({}, $.pnotify.defaults, options);
            }

            if (opts.pnotify_before_init) {
                if (opts.pnotify_before_init(opts) === false)
                    return null;
            }

            // This keeps track of the last element the mouse was over, so
            // mouseleave, mouseenter, etc can be called.
            var nonblock_last_elem;
            // This is used to pass events through the notice if it is non-blocking.
            var nonblock_pass = function(e, e_name){
                pnotify.css("display", "none");
                var element_below = document.elementFromPoint(e.clientX, e.clientY);
                pnotify.css("display", "block");
                var jelement_below = $(element_below);
                var cursor_style = jelement_below.css("cursor");
                pnotify.css("cursor", cursor_style != "auto" ? cursor_style : "default");
                // If the element changed, call mouseenter, mouseleave, etc.
                if (!nonblock_last_elem || nonblock_last_elem.get(0) != element_below) {
                    if (nonblock_last_elem) {
                        dom_event.call(nonblock_last_elem.get(0), "mouseleave", e.originalEvent);
                        dom_event.call(nonblock_last_elem.get(0), "mouseout", e.originalEvent);
                    }
                    dom_event.call(element_below, "mouseenter", e.originalEvent);
                    dom_event.call(element_below, "mouseover", e.originalEvent);
                }
                dom_event.call(element_below, e_name, e.originalEvent);
                // Remember the latest element the mouse was over.
                nonblock_last_elem = jelement_below;
            };

            // Create our widget.
            // Stop animation, reset the removal timer, and show the close
            // button when the user mouses over.
            var pnotify = $("<div />", {
                "class": "ui-pnotify "+opts.pnotify_addclass,
                "css": {"display": "none"},
                "mouseenter": function(e){
                    if (opts.pnotify_nonblock) e.stopPropagation();
                    if (opts.pnotify_mouse_reset && animating == "out") {
                        // If it's animating out, animate back in really quick.
                        pnotify.stop(true);
                        animating = "in";
                        pnotify.css("height", "auto").animate({"width": opts.pnotify_width, "opacity": opts.pnotify_nonblock ? opts.pnotify_nonblock_opacity : opts.pnotify_opacity}, "fast");
                    }
                    if (opts.pnotify_nonblock) {
                        // If it's non-blocking, animate to the other opacity.
                        pnotify.animate({"opacity": opts.pnotify_nonblock_opacity}, "fast");
                    }
                    if (opts.pnotify_hide && opts.pnotify_mouse_reset) pnotify.pnotify_cancel_remove();
                    if (opts.pnotify_closer && !opts.pnotify_nonblock) pnotify.closer.show();
                },
                "mouseleave": function(e){
                    if (opts.pnotify_nonblock) e.stopPropagation();
                    nonblock_last_elem = null;
                    pnotify.css("cursor", "auto");
                    if (opts.pnotify_nonblock && animating != "out")
                        pnotify.animate({"opacity": opts.pnotify_opacity}, "fast");
                    if (opts.pnotify_hide && opts.pnotify_mouse_reset) pnotify.pnotify_queue_remove();
                    pnotify.closer.hide();
                    $.pnotify_position_all();
                },
                "mouseover": function(e){
                    if (opts.pnotify_nonblock) e.stopPropagation();
                },
                "mouseout": function(e){
                    if (opts.pnotify_nonblock) e.stopPropagation();
                },
                "mousemove": function(e){
                    if (opts.pnotify_nonblock) {
                        e.stopPropagation();
                        nonblock_pass(e, "onmousemove");
                    }
                },
                "mousedown": function(e){
                    if (opts.pnotify_nonblock) {
                        e.stopPropagation();
                        e.preventDefault();
                        nonblock_pass(e, "onmousedown");
                    }
                },
                "mouseup": function(e){
                    if (opts.pnotify_nonblock) {
                        e.stopPropagation();
                        e.preventDefault();
                        nonblock_pass(e, "onmouseup");
                    }
                },
                "click": function(e){
                    if (opts.pnotify_nonblock) {
                        e.stopPropagation();
                        nonblock_pass(e, "onclick");
                    }
                },
                "dblclick": function(e){
                    if (opts.pnotify_nonblock) {
                        e.stopPropagation();
                        nonblock_pass(e, "ondblclick");
                    }
                }
            });
            pnotify.opts = opts;
            // Create a drop shadow.
            if (opts.pnotify_shadow && !$.browser.msie)
                pnotify.shadow_container = $("<div />", {"class": "ui-widget-shadow ui-corner-all ui-pnotify-shadow"}).prependTo(pnotify);
            // Create a container for the notice contents.
            pnotify.container = $("<div />", {"class": "ui-widget ui-widget-content ui-corner-all ui-pnotify-container "+(opts.pnotify_type == "error" ? "ui-state-error" : "ui-state-highlight")}).appendTo(pnotify);

            pnotify.pnotify_version = "1.0.1";

            // This function is for updating the notice.
            pnotify.pnotify = function(options) {
                // Update the notice.
                var old_opts = opts;
                if (typeof options == "string")
                    opts.pnotify_text = options;
                else
                    opts = $.extend({}, opts, options);
                pnotify.opts = opts;
                // Update the shadow.
                if (opts.pnotify_shadow != old_opts.pnotify_shadow) {
                    if (opts.pnotify_shadow && !$.browser.msie)
                        pnotify.shadow_container = $("<div />", {"class": "ui-widget-shadow ui-pnotify-shadow"}).prependTo(pnotify);
                    else
                        pnotify.children(".ui-pnotify-shadow").remove();
                }
                // Update the additional classes.
                if (opts.pnotify_addclass === false)
                    pnotify.removeClass(old_opts.pnotify_addclass);
                else if (opts.pnotify_addclass !== old_opts.pnotify_addclass)
                    pnotify.removeClass(old_opts.pnotify_addclass).addClass(opts.pnotify_addclass);
                // Update the title.
                if (opts.pnotify_title === false)
                    pnotify.title_container.hide("fast");
                else if (opts.pnotify_title !== old_opts.pnotify_title)
                    pnotify.title_container.html(opts.pnotify_title).show(200);
                // Update the text.
                if (opts.pnotify_text === false) {
                    pnotify.text_container.hide("fast");
                } else if (opts.pnotify_text !== old_opts.pnotify_text) {
                    if (opts.pnotify_insert_brs)
                        opts.pnotify_text = opts.pnotify_text.replace(/\n/g, "<br />");
                    pnotify.text_container.html(opts.pnotify_text).show(200);
                }
                pnotify.pnotify_history = opts.pnotify_history;
                // Change the notice type.
                if (opts.pnotify_type != old_opts.pnotify_type)
                    pnotify.container.toggleClass("ui-state-error ui-state-highlight");
                if ((opts.pnotify_notice_icon != old_opts.pnotify_notice_icon && opts.pnotify_type == "notice") ||
                    (opts.pnotify_error_icon != old_opts.pnotify_error_icon && opts.pnotify_type == "error") ||
                    (opts.pnotify_type != old_opts.pnotify_type)) {
                    // Remove any old icon.
                    pnotify.container.find("div.ui-pnotify-icon").remove();
                    if ((opts.pnotify_error_icon && opts.pnotify_type == "error") || (opts.pnotify_notice_icon)) {
                        // Build the new icon.
                        $("<div />", {"class": "ui-pnotify-icon"}).append($("<span />", {"class": opts.pnotify_type == "error" ? opts.pnotify_error_icon : opts.pnotify_notice_icon})).prependTo(pnotify.container);
                    }
                }
                // Update the width.
                if (opts.pnotify_width !== old_opts.pnotify_width)
                    pnotify.animate({width: opts.pnotify_width});
                // Update the minimum height.
                if (opts.pnotify_min_height !== old_opts.pnotify_min_height)
                    pnotify.container.animate({minHeight: opts.pnotify_min_height});
                // Update the opacity.
                if (opts.pnotify_opacity !== old_opts.pnotify_opacity)
                    pnotify.fadeTo(opts.pnotify_animate_speed, opts.pnotify_opacity);
                if (!opts.pnotify_hide)
                    pnotify.pnotify_cancel_remove();
                else if (!old_opts.pnotify_hide)
                    pnotify.pnotify_queue_remove();
                pnotify.pnotify_queue_position();
                return pnotify;
            };

            // Queue the position function so it doesn't run repeatedly and use
            // up resources.
            pnotify.pnotify_queue_position = function() {
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout($.pnotify_position_all, 10);
            };

            // Display the notice.
            pnotify.pnotify_display = function() {
                // If the notice is not in the DOM, append it.
                if (!pnotify.parent().length)
                    pnotify.appendTo(body);
                // Run callback.
                if (opts.pnotify_before_open) {
                    if (opts.pnotify_before_open(pnotify) === false)
                        return;
                }
                pnotify.pnotify_queue_position();
                // First show it, then set its opacity, then hide it.
                if (opts.pnotify_animation == "fade" || opts.pnotify_animation.effect_in == "fade") {
                    // If it's fading in, it should start at 0.
                    pnotify.show().fadeTo(0, 0).hide();
                } else {
                    // Or else it should be set to the opacity.
                    if (opts.pnotify_opacity != 1)
                        pnotify.show().fadeTo(0, opts.pnotify_opacity).hide();
                }
                pnotify.animate_in(function(){
                    if (opts.pnotify_after_open)
                        opts.pnotify_after_open(pnotify);

                    pnotify.pnotify_queue_position();

                    // Now set it to hide.
                    if (opts.pnotify_hide)
                        pnotify.pnotify_queue_remove();
                });
            };

            // Remove the notice.
            pnotify.pnotify_remove = function() {
                if (pnotify.timer) {
                    window.clearTimeout(pnotify.timer);
                    pnotify.timer = null;
                }
                // Run callback.
                if (opts.pnotify_before_close) {
                    if (opts.pnotify_before_close(pnotify) === false)
                        return;
                }
                pnotify.animate_out(function(){
                    if (opts.pnotify_after_close) {
                        if (opts.pnotify_after_close(pnotify) === false)
                            return;
                    }
                    pnotify.pnotify_queue_position();
                    // If we're supposed to remove the notice from the DOM, do it.
                    if (opts.pnotify_remove)
                        pnotify.detach();
                });
            };

            // Animate the notice in.
            pnotify.animate_in = function(callback){
                // Declare that the notice is animating in. (Or has completed animating in.)
                animating = "in";
                var animation;
                if (typeof opts.pnotify_animation.effect_in != "undefined")
                    animation = opts.pnotify_animation.effect_in;
                else
                    animation = opts.pnotify_animation;
                if (animation == "none") {
                    pnotify.show();
                    callback();
                } else if (animation == "show")
                    pnotify.show(opts.pnotify_animate_speed, callback);
                else if (animation == "fade")
                    pnotify.show().fadeTo(opts.pnotify_animate_speed, opts.pnotify_opacity, callback);
                else if (animation == "slide")
                    pnotify.slideDown(opts.pnotify_animate_speed, callback);
                else if (typeof animation == "function")
                    animation("in", callback, pnotify);
                else if (pnotify.effect)
                    pnotify.effect(animation, {}, opts.pnotify_animate_speed, callback);
            };

            // Animate the notice out.
            pnotify.animate_out = function(callback){
                // Declare that the notice is animating out. (Or has completed animating out.)
                animating = "out";
                var animation;
                if (typeof opts.pnotify_animation.effect_out != "undefined")
                    animation = opts.pnotify_animation.effect_out;
                else
                    animation = opts.pnotify_animation;
                if (animation == "none") {
                    pnotify.hide();
                    callback();
                } else if (animation == "show")
                    pnotify.hide(opts.pnotify_animate_speed, callback);
                else if (animation == "fade")
                    pnotify.fadeOut(opts.pnotify_animate_speed, callback);
                else if (animation == "slide")
                    pnotify.slideUp(opts.pnotify_animate_speed, callback);
                else if (typeof animation == "function")
                    animation("out", callback, pnotify);
                else if (pnotify.effect)
                    pnotify.effect(animation, {}, opts.pnotify_animate_speed, callback);
            };

            // Cancel any pending removal timer.
            pnotify.pnotify_cancel_remove = function() {
                if (pnotify.timer)
                    window.clearTimeout(pnotify.timer);
            };

            // Queue a removal timer.
            pnotify.pnotify_queue_remove = function() {
                // Cancel any current removal timer.
                pnotify.pnotify_cancel_remove();
                pnotify.timer = window.setTimeout(function(){
                    pnotify.pnotify_remove();
                }, (isNaN(opts.pnotify_delay) ? 0 : opts.pnotify_delay));
            };

            // Provide a button to close the notice.
            pnotify.closer = $("<div />", {
                "class": "ui-pnotify-closer",
                "css": {"cursor": "pointer", "display": "none"},
                "click": function(){
                    pnotify.pnotify_remove();
                    pnotify.closer.hide();
                }
            }).append($("<span />", {"class": "ui-icon ui-icon-circle-close"})).appendTo(pnotify.container);

            // Add the appropriate icon.
            if ((opts.pnotify_error_icon && opts.pnotify_type == "error") || (opts.pnotify_notice_icon)) {
                $("<div />", {"class": "ui-pnotify-icon"}).append($("<span />", {"class": opts.pnotify_type == "error" ? opts.pnotify_error_icon : opts.pnotify_notice_icon})).appendTo(pnotify.container);
            }

            // Add a title.
            pnotify.title_container = $("<div />", {
                "class": "ui-pnotify-title",
                "html": opts.pnotify_title
            }).appendTo(pnotify.container);
            if (opts.pnotify_title === false)
                pnotify.title_container.hide();

            // Replace new lines with HTML line breaks.
            if (opts.pnotify_insert_brs && typeof opts.pnotify_text == "string")
                opts.pnotify_text = opts.pnotify_text.replace(/\n/g, "<br />");
            // Add text.
            pnotify.text_container = $("<div />", {
                "class": "ui-pnotify-text",
                "html": opts.pnotify_text
            }).appendTo(pnotify.container);
            if (opts.pnotify_text === false)
                pnotify.text_container.hide();

            // Set width and min height.
            if (typeof opts.pnotify_width == "string")
                pnotify.css("width", opts.pnotify_width);
            if (typeof opts.pnotify_min_height == "string")
                pnotify.container.css("min-height", opts.pnotify_min_height);

            // The history variable controls whether the notice gets redisplayed
            // by the history pull down.
            pnotify.pnotify_history = opts.pnotify_history;

            // Add the notice to the notice array.
            var body_data = body.data("pnotify");
            if (body_data == null || typeof body_data != "object")
                body_data = [];
            if (opts.pnotify_stack.push == "top")
                body_data = $.merge([pnotify], body_data);
            else
                body_data = $.merge(body_data, [pnotify]);
            body.data("pnotify", body_data);

            // Run callback.
            if (opts.pnotify_after_init)
                opts.pnotify_after_init(pnotify);

            if (opts.pnotify_history) {
                // If there isn't a history pull down, create one.
                var body_history = body.data("pnotify_history");
                if (typeof body_history == "undefined") {
                    body_history = $("<div />", {
                        "class": "ui-pnotify-history-container ui-state-default ui-corner-bottom",
                        "mouseleave": function(){
                            body_history.animate({top: "-"+history_handle_top+"px"}, {duration: 100, queue: false});
                        }
                    }).append($("<div />", {"class": "ui-pnotify-history-header", "text": "Redisplay"})).append($("<button />", {
                            "class": "ui-pnotify-history-all ui-state-default ui-corner-all",
                            "text": "All",
                            "mouseenter": function(){
                                $(this).addClass("ui-state-hover");
                            },
                            "mouseleave": function(){
                                $(this).removeClass("ui-state-hover");
                            },
                            "click": function(){
                                // Display all notices. (Disregarding non-history notices.)
                                $.each(body_data, function(){
                                    if (this.pnotify_history && this.pnotify_display)
                                        this.pnotify_display();
                                });
                                return false;
                            }
                    })).append($("<button />", {
                            "class": "ui-pnotify-history-last ui-state-default ui-corner-all",
                            "text": "Last",
                            "mouseenter": function(){
                                $(this).addClass("ui-state-hover");
                            },
                            "mouseleave": function(){
                                $(this).removeClass("ui-state-hover");
                            },
                            "click": function(){
                                // Look up the last history notice, and display it.
                                var i = 1;
                                while (!body_data[body_data.length - i] || !body_data[body_data.length - i].pnotify_history || body_data[body_data.length - i].is(":visible")) {
                                    if (body_data.length - i === 0)
                                        return false;
                                    i++;
                                }
                                var n = body_data[body_data.length - i];
                                if (n.pnotify_display)
                                    n.pnotify_display();
                                return false;
                            }
                    })).appendTo(body);

                    // Make a handle so the user can pull down the history pull down.
                    var handle = $("<span />", {
                        "class": "ui-pnotify-history-pulldown ui-icon ui-icon-grip-dotted-horizontal",
                        "mouseenter": function(){
                            body_history.animate({top: "0"}, {duration: 100, queue: false});
                        }
                    }).appendTo(body_history);

                    // Get the top of the handle.
                    history_handle_top = handle.offset().top + 2;
                    // Hide the history pull down up to the top of the handle.
                    body_history.css({top: "-"+history_handle_top+"px"});
                    // Save the history pull down.
                    body.data("pnotify_history", body_history);
                }
            }

            // Mark the stack so it won't animate the new notice.
            opts.pnotify_stack.animation = false;

            // Display the notice.
            pnotify.pnotify_display();

            return pnotify;
        }
    });

    // Some useful regexes.
    var re_on = /^on/;
    var re_mouse_events = /^(dbl)?click$|^mouse(move|down|up|over|out|enter|leave)$|^contextmenu$/;
    var re_ui_events = /^(focus|blur|select|change|reset)$|^key(press|down|up)$/;
    var re_html_events = /^(scroll|resize|(un)?load|abort|error)$/;
    // Fire a DOM event.
    var dom_event = function(e, orig_e){
        var event_object;
        e = e.toLowerCase();
        if (document.createEvent && this.dispatchEvent) {
            // FireFox, Opera, Safari, Chrome
            e = e.replace(re_on, '');
            if (e.match(re_mouse_events)) {
                // This allows the click event to fire on the notice. There is
                // probably a much better way to do it.
                $(this).offset();
                event_object = document.createEvent("MouseEvents");
                event_object.initMouseEvent(
                    e, orig_e.bubbles, orig_e.cancelable, orig_e.view, orig_e.detail,
                    orig_e.screenX, orig_e.screenY, orig_e.clientX, orig_e.clientY,
                    orig_e.ctrlKey, orig_e.altKey, orig_e.shiftKey, orig_e.metaKey, orig_e.button, orig_e.relatedTarget
                );
            } else if (e.match(re_ui_events)) {
                event_object = document.createEvent("UIEvents");
                event_object.initUIEvent(e, orig_e.bubbles, orig_e.cancelable, orig_e.view, orig_e.detail);
            } else if (e.match(re_html_events)) {
                event_object = document.createEvent("HTMLEvents");
                event_object.initEvent(e, orig_e.bubbles, orig_e.cancelable);
            }
            if (!event_object) return;
            this.dispatchEvent(event_object);
        } else {
            // Internet Explorer
            if (!e.match(re_on)) e = "on"+e;
            event_object = document.createEventObject(orig_e);
            this.fireEvent(e, event_object);
        }
    };

    $.pnotify.defaults = {
        // The notice's title.
        pnotify_title: false,
        // The notice's text.
        pnotify_text: false,
        // Additional classes to be added to the notice. (For custom styling.)
        pnotify_addclass: "",
        // Create a non-blocking notice. It lets the user click elements underneath it.
        pnotify_nonblock: false,
        // The opacity of the notice (if it's non-blocking) when the mouse is over it.
        pnotify_nonblock_opacity: 0.2,
        // Display a pull down menu to redisplay previous notices, and place the notice in the history.
        pnotify_history: true,
        // Width of the notice.
        pnotify_width: "300px",
        // Minimum height of the notice. It will expand to fit content.
        pnotify_min_height: "16px",
        // Type of the notice. "notice" or "error".
        pnotify_type: "notice",
        // The icon class to use if type is notice.
        pnotify_notice_icon: "ui-icon ui-icon-info",
        // The icon class to use if type is error.
        pnotify_error_icon: "ui-icon ui-icon-alert",
        // The animation to use when displaying and hiding the notice. "none", "show", "fade", and "slide" are built in to jQuery. Others require jQuery UI. Use an object with effect_in and effect_out to use different effects.
        pnotify_animation: "fade",
        // Speed at which the notice animates in and out. "slow", "def" or "normal", "fast" or number of milliseconds.
        pnotify_animate_speed: "slow",
        // Opacity of the notice.
        pnotify_opacity: 1,
        // Display a drop shadow.
        pnotify_shadow: false,
        // Provide a button for the user to manually close the notice.
        pnotify_closer: true,
        // After a delay, remove the notice.
        pnotify_hide: true,
        // Delay in milliseconds before the notice is removed.
        pnotify_delay: 8000,
        // Reset the hide timer if the mouse moves over the notice.
        pnotify_mouse_reset: true,
        // Remove the notice's elements from the DOM after it is removed.
        pnotify_remove: true,
        // Change new lines to br tags.
        pnotify_insert_brs: true,
        // The stack on which the notices will be placed. Also controls the direction the notices stack.
        pnotify_stack: {"dir1": "down", "dir2": "left", "push": "bottom"}
    };
})(jQuery);
