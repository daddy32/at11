/* eslint-disable max-len, no-undef */
var RETRY_COOLDOWN_SECONDS = 30;
var RETRY_ICON_HTML = "&#x1F504;&#xFE0F;";
var MENU_ROLLOVER_HOUR = 16;

function writeCookie(cookieName, cookieValue, nDays) {
    var today = new Date();
    var expire = new Date();
    if (!nDays) { nDays = 1; }
    expire.setTime(today.getTime() + 3600 * 1000 * 24 * nDays);
    document.cookie = cookieName + "=" + escape(cookieValue) + ";expires=" + expire.toUTCString() + ";path=/";
}

function readCookie(name) {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
        var nameValue = cookies[i].split("=");
        if (nameValue[0].trim() === name) {
            return unescape(nameValue[1].trim());
        }
    }
}

function getLocationSlug() {
    return document.body.getAttribute("data-location-slug") || "patronka";
}

function getHiddenRestaurantsCookieKey() {
    return "hiddenRestaurants:" + getLocationSlug();
}

function getRetryButtonLabel(secondsRemaining) {
    if (secondsRemaining > 0) {
        return RETRY_ICON_HTML + " Sk\u00fasi\u0165 znova o " + secondsRemaining + " s";
    }

    return RETRY_ICON_HTML + " Sk\u00fasi\u0165 znova";
}

function loadMenus(container) {
    var dateCompound = getDateCompound();

    $("#date").text(dateCompound.description);
    var date = dateCompound.date;
    $("article", container).each(function() {
        loadMenu($(this), date, container, false);
    });
}

function buildMenuUrl(restaurantId, date, forceRefresh) {
    var url = "/menu/" + restaurantId + "?date=" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    if (forceRefresh) {
        url += "&forceRefresh=1";
    }
    return url;
}

function createErrorElement(link) {
    var errElem = $("<li class='error'><span></span></li>");
    var spanElem = errElem.find("span");

    spanElem.append("Nepodarilo sa na\u010d\u00edta\u0165 menu, sk\u00fas pozrie\u0165 priamo na ");
    spanElem.append($("<a></a>")
            .prop("href", link)
            .prop("target", "_blank")
            .text("str\u00e1nke re\u0161taur\u00e1cie"));

    return errElem;
}

function appendRetryControl(article, date, container, listElem) {
    var retryElem = $("<li class='retry'><span></span></li>");
    var retryButton = $("<button type='button' class='retry-button' disabled></button>");
    var secondsRemaining = RETRY_COOLDOWN_SECONDS;

    retryButton.html(getRetryButtonLabel(secondsRemaining));
    retryButton.on("click", function() {
        if (retryButton.prop("disabled")) {
            return;
        }

        article.find("ul, i.timeago").remove();
        if (article.find(".loader").length === 0) {
            article.append("<div class='loader'></div>");
        }
        container.masonry();

        loadMenu(article, date, container, true);
    });

    var countdownInterval = window.setInterval(function() {
        if (retryButton.closest("body").length === 0) {
            window.clearInterval(countdownInterval);
            return;
        }

        secondsRemaining -= 1;
        if (secondsRemaining <= 0) {
            window.clearInterval(countdownInterval);
            retryButton.prop("disabled", false);
            retryButton.html(getRetryButtonLabel(0));
            return;
        }

        retryButton.html(getRetryButtonLabel(secondsRemaining));
    }, 1000);

    retryElem.find("span").append(retryButton);
    listElem.append(retryElem);
}

function loadMenu(article, date, container, forceRefresh) {
    var restaurantId = article.data("restaurantId");
    var link = $("a", article).prop("href");
    var listElem = $("<ul></ul>");
    var refreshElem = null;
    var hasDummyItem = false;

    $.ajax(buildMenuUrl(restaurantId, date, forceRefresh))
            .done(function(data) {
                if (data.menu.length === 0) {
                    listElem.append(createErrorElement(link));
                    appendRetryControl(article, date, container, listElem);
                }
                else {
                    data.menu.forEach(function(item) {
                        var li = $("<li></li>");
                        if (item.isSoup) {
                            li.addClass("soup");
                        }
                        if (item.isDummy) {
                            li.addClass("dummy-item");
                            if (item.tooltip) {
                                li.attr("title", item.tooltip);
                            }
                            hasDummyItem = true;
                        }
                        li.append("<span>" + item.text + "</span>");
                        if (item.price) {
                            li.append("<span class='price'>" + item.price.toLocaleString("sk", { style: "currency", currency: "EUR" }) + "</span>");
                        }
                        listElem.append(li);
                    });
                }
                refreshElem = "<i class='timeago'>" + data.timeago + "</i>";
            })
            .fail(function(jxhr) {
                listElem.append(createErrorElement(link));
                appendRetryControl(article, date, container, listElem);
                if (jxhr.responseJSON && jxhr.responseJSON.timeago) {
                    refreshElem = "<i class='timeago'>" + jxhr.responseJSON.timeago + "</i>";
                }
            })
            .always(function() {
                article.find(".loader").remove();
                article.find("ul, i.timeago").remove();
                article.removeClass("dummy-menu");
                if (hasDummyItem) {
                    article.addClass("dummy-menu");
                }
                article.append(listElem);
                if (refreshElem) {
                    article.append(refreshElem);
                }
                container.masonry();
            });
}

function initialHide(cont) {
    window.hiddenRestaurants = {};
    var hidden = readCookie(getHiddenRestaurantsCookieKey());
    if (typeof hidden === "undefined") {
        return;
    }
    hidden = hidden.split(",");

    $("article", cont).each(function() {
        var article = $(this);
        var restaurantId = article.data("restaurantId");
        if (hidden.indexOf(restaurantId.toString()) > -1) // hide
        {
            window.hiddenRestaurants[restaurantId.toString()] = article;
            article.remove();
            $("input[type=checkbox][value=" + restaurantId + "]", "#selectrestaurants").prop("checked", false);
        }
    });
}

function getDateCompound() {
    var date = new Date();
    var desc = "dnes";
    if (date.getHours() >= MENU_ROLLOVER_HOUR) {
        date.setDate(date.getDate() + 1);
        desc = "zajtra";
    }
    console.log("Date: " + date.toLocaleDateString("sk"));
    // if the date is a weekend, skip to next monday
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
        desc = "pondelok";
    }
    return { date: date, description: desc + " " + date.toLocaleDateString("sk") };
}

function startClock() {
     // CSS3 Analog Clock- by JavaScript Kit (www.javascriptkit.com)
     var $hands = $("#liveclock div.hand");
     window.requestAnimationFrame = window.requestAnimationFrame
                                    || window.mozRequestAnimationFrame
                                    || window.webkitRequestAnimationFrame
                                    || window.msRequestAnimationFrame
                                    || function(f){setTimeout(f, 60);};
     function updateclock(){
         var curdate = new Date();
         var hour_as_degree = ( curdate.getHours() + curdate.getMinutes() / 60 ) / 12 * 360;
         var minute_as_degree = curdate.getMinutes() / 60 * 360;
         var second_as_degree = ( curdate.getSeconds() + curdate.getMilliseconds() / 1000 ) / 60 * 360;
         $hands.filter(".hour").css({ transform: "rotate(" + hour_as_degree + "deg)" });
         $hands.filter(".minute").css({ transform: "rotate(" + minute_as_degree + "deg)" });
         $hands.filter(".second").css({ transform: "rotate(" + second_as_degree + "deg)" });
         requestAnimationFrame(updateclock);
     }
     requestAnimationFrame(updateclock);
}

startClock();
var container = $("#container");
loadMenus(container);
initialHide(container);
container.masonry({
    itemSelector: "article",
    columnWidth: ".grid-sizer",
    gutter: 20,
    fitWidth: true
});

$("#selectrestaurants").on("click", function(e) {
    e.stopPropagation();

    var $target = $(e.target);
    var checkbox;
    if ($target.val() === 0) {
        checkbox = $target.children("input").length > 0 ? $target.children("input") : $target.siblings("input");
        checkbox.prop("checked", !checkbox.prop("checked"));
    }
    else {
        checkbox = $target;
    }

    var id = checkbox.val();
    var article;
    if (checkbox.prop("checked"))//show
    {
        article = window.hiddenRestaurants[id.toString()];
        delete window.hiddenRestaurants[id.toString()];
        container.append(article).masonry("appended", article).masonry();
    }
    else//hide
    {
        article = $("article[data-restaurant-id=" + id + "]", container);
        window.hiddenRestaurants[id.toString()] = article;
        container.masonry("remove", article).masonry();
    }

    var unChecked = [];
    $("input[type=\"checkbox\"]", this).each(function() {
        if (!$(this).prop("checked")) {
            unChecked.push($(this).val());
        }
    });
    writeCookie(getHiddenRestaurantsCookieKey(), unChecked.join(","), 10 * 365);
});

// run additional layout when page is fully loaded (including fonts, images etc..)
$(window).on("load", function() {
    container.masonry();
});
