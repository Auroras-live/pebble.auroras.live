var UI = require('ui'); // For drawing cards, menus and windows
var Vector2 = require('vector2'); // For positioning items
var ajax = require('ajax'); // For retrieving data
var api = "https://api.auroras.live/v1/?source=pebble&tz=" + new Date().getTimezoneOffset() + "&"; // Where the data is coming from
var window = new UI.Window(); // Create a new window
var ajaxData; // To hold our AJAX data
var elements = []; // This holds all the elements currently drawn on screen
var location = {}; // The results of our geolocation API
var weather = {};

var debug = false;

// Create a splash screen
log("Timezone offset is: " + new Date().getTimezoneOffset());
log("Creating splash screen..");
elements.splash = new UI.Image({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  image: "images/logo-144.png",
});
log("Adding splash screen element to window..");
window.add(elements.splash);

// Show the window
log("Showing the window..");
window.show();
// Get the user's location
getLocation();

// Update our data every 60 seconds. The docs say not to do this,
// but I don't know of any other way (except the Wakeup API?) to do this
setInterval(function() {
  log("60 seconds have elapsed. Updating..");
  getLocation();
}, 60000);

// Updates our data via AJAX
function update() {
  log("Update function called");

  ajax({
      url: api + "type=all&images=false&forecast=false&lat=" + location.lat + "&long=" + location.long,
      type: 'json'
    },
    function(data) {
      log("Data returned. " + data.length + " bytes returned");

      // Clear the splash screen if it's there.
      elements.splash.remove();
      log("Getting location in update function");

      // Set our data
      ajaxData = data;

      showData(ajaxData);

    }.bind(this),
    function(err) {
      log(err);
    });
}

// This function takes our AJAX data and creates
// the elements necessary to show the data
function showData(data) {
  log("Showing data");
  // For displaying when the data was last updated. This time is
  // provided by the API server, NOT the local time, so you know
  // when the last API call was.
  var d = new Date(data.ace.date);

  // The text command takes the follow parameters:
  // window = A UI.Window element
  // text = The text to display
  // width = The width of the text "box"
  // x, y = The X & Y coordinates of where to display the box
  // id = A unique ID that is used to update the text later (instead of destroying and recreating the element)
  text(window, "Kp / 1hr: " + data.ace.kp + " / " + data.ace.kp1hour, 144, 10, 10, "1");
  text(window, "Prob. / High.: " + data.probability.calculated.value + "% / " + data.probability.highest.value + "%", 144, 10, 30, "2");
  //   text(window, "Kp 1 hr.", 40, 10, 30, "3");
  //   text(window, data.ace.kp1hour, 90, 50, 30, "4");
  text(window, "Retrieved: " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2), 144, 10, 130, "3");

  // And gauge works like this:
  // window = A UI.Window element
  // value = A value between min and max
  // width = The width of the gauge on the screen
  // min, max = The maximum and minimum values allowed in the gauge
  // x, y = The X & Y coordinates that determine where the gauge will be drawn
  // label = A short label for the gauge. The text is 1/3 of the width, so keep it short.
  // id = A unique ID that is used to update the black part of the gauge (the value) later
  gauge(window, parseInt(-data.ace.bz) + 20, 128, 0, 40, 10, 60, "Bz", "g2", data.ace.colour.bz);
  gauge(window, parseInt(data.ace.speed), 128, 200, 1000, 10, 80, "Spd.", "g3", data.ace.colour.speed);
  gauge(window, parseInt(data.ace.density), 128, 0, 20, 10, 100, "Den.", "g4", data.ace.colour.density);
  log("showData function finished");
}

// Shows the raw numbers (no gauges)
function showRaw(data) {
  log("showRaw function called");
  var d = new Date(data.ace.date);


  var card = new UI.Card({
    title: "ACE Values",
    scrollable: true,
    body: "Bz: " + data.ace.bz + "\n" +
      "Speed: " + data.ace.speed + "\n" +
      "Density: " + data.ace.density + "\n" +
      "Kp: " + data.ace.kp + "\n" +
      "Kp 1 hr: " + data.ace.kp1hour + "\n" +
      "Kp 4 hr: " + data.ace.kp4hour + "\n" +
      "Probability: " + data.probability.calculated.value + "\n" +
      "Worldwide: " + data.probability.highest.value + "\n" +
      "Retrieved: " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)
  });
  card.show();

}

// Shows the 3 day Kp forecast as a menu
function show3day(data) {

  log("show3day function called");
  // Get the 3day from the API

  // Create a new menu
  var menu = new UI.Menu({
    backgroundColor: 'black',
    textColor: 'white',
    highlightBackgroundColor: 'white',
    highlightTextColor: 'black'
  });


  var sections = [];
  data.threeday.dates.forEach(function(item) {
    // Make it into a date.
    var d = new Date(item);
    // Push the date into a new section
    sections.push({
      title: ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2)
    });
  });

  // Loop through the 3 day data. First part of the data is the date
  Object.keys(data.threeday.values).forEach(function(item, index) {
    sections[index].items = [];
    data.threeday.values[index].forEach(function(item2, index2) {
      var ds = new Date(item2.start);
      var de = new Date(item2.end);
      ds.setMinutes(ds.getMinutes() + ds.getTimezoneOffset());
      de.setMinutes(de.getMinutes() + de.getTimezoneOffset());

      sections[index].items.push({
        title: ("0" + ds.getHours()).slice(-2) + ":" + ("0" + ds.getMinutes()).slice(-2) + "-" + ("0" + de.getHours()).slice(-2) + ":" + ("0" + de.getMinutes()).slice(-2) + " - " + item2.value
      });

    });
  });
  // Finally, add the section to the menu
  menu.sections(sections);
  // And show the menu
  menu.show();

}

function showAbout() {
  var about = new UI.Card({
    title: "Auroras.live",
    scrollable: true,
    style: "small",
    subtitle: "A watch app for aurora hunters",
    body: "\n" + "https://auroras.live" + "\n" + "\n" + "Written by David 'Grayda' Gray"
  });
  about.show();
}

// Shows a gauge on the screen. It'll auto-adjust the positions and such based on the width
function gauge(window, value, width, min, max, x, y, label, id, colour) {

  // Can't go beyond our max, no matter how hard we try
  if (value > max) {
    value = max;
  } else if (value < min) {
    value = min;
  }

  var border = 4;

  // Probably the most maths I've done since high school.
  var barWidth = Math.ceil((2 / 3 * width) * (value / (min + max) * 100) / 100);

  // Bar widths < 1 cause some funky layout issues, so snap to 1 if < 1
  if (barWidth < 1) {
    barWidth = 1;
  }

  console.log(label + " - " + barWidth);

  // If the element doesn't exist already, add it to the list of elements
  if (typeof elements[id] === "undefined") {
    elements[id + "_" + "1"] = new UI.Text({
      position: new Vector2(x, y),
      size: new Vector2(width / 3, 15),
      textOverflow: "ellipsis",
      text: label,
      font: "gothic-14",
      textAlign: "left"
    });
    elements[id + "_" + "2"] = new UI.Rect({
      position: new Vector2(x + (width / 3), y),
      size: new Vector2(2 / 3 * width, 15),
      backgroundColor: "black",
      borderColor: "white"
    });
    elements[id + "_" + "3"] = new UI.Rect({
      position: new Vector2((x + (width / 3)) + (border / 2), y + (border / 2)),
      size: new Vector2(barWidth - border, 15 - border),
      backgroundColor: colour
    });

    // And add the element to the window
    window.add(elements[id + "_" + "1"]);
    window.add(elements[id + "_" + "2"]);
    window.add(elements[id + "_" + "3"]);

    // Otherwise if the element already exists
  } else {
    // Adjust the width of the black portion of the bar
    elements[id + "_" + 3].size(new Vector2(barWidth - border, 15 - border));
  }

}

// Shows text on the screen. Very similar to gauge. If the element doesn't exist, add it to the elements array and show it. Otherwise update the text
function text(window, text, width, x, y, id) {
  if (typeof elements[id] === "undefined") {
    elements[id] = new UI.Text({
      position: new Vector2(x, y),
      size: new Vector2(width, 15),
      textOverflow: "ellipsis",
      text: text,
      font: "gothic-14",
      textAlign: "left"
    });
    window.add(elements[id]);
  } else {
    elements[id].text(text);
  }

}

// When we're on the main screen and we press the middle button
window.on("click", "select", function(event) {
  // Create a new menu
  var mainmenu = new UI.Menu({
    backgroundColor: 'black',
    textColor: 'white',
    highlightBackgroundColor: 'white',
    highlightTextColor: 'black',
    sections: [{
      items: [{
        title: 'Reload',
        subtitle: 'Reload data',
      }, {
        title: 'See Values',
        subtitle: "See raw values"
      }, {
        title: "Kp Forecast",
        subtitle: "3 day Kp forecast"
      }, {
        title: "Weather",
        subtitle: "Current weather"
      }, {
        title: "About this app",
        subtitle: "Show info about this watchapp"
      }]
    }]
  });

  mainmenu.show();

  // When we've picked a menu item
  mainmenu.on('select', function(e) {
    switch (e.item.title) {
      case "Reload":
        update(true);
        mainmenu.hide();
        break;
      case "See Values":
        showRaw(ajaxData);
        break;
      case "Kp Forecast":
        show3day(ajaxData);
        break;
      case "Weather":
        showWeather(ajaxData);
        break;
      case "About this app":
        showAbout();
        break;
    }

  });




});

function getLocation() {
  log("getLocation called");
  navigator.geolocation.getCurrentPosition(function(position) {
    log("Coordinates received: " + position.coords.latitude + ", " + position.coords.longitude);
    location = {
      "lat": position.coords.latitude,
      "long": position.coords.longitude
    };
    update();

  }.bind(this), function(error) {
    log("Error getting location. Defaulting to Melbourne");
    location = {
      "lat": -37.8142678,
      "long": 144.9619953
    };

    log("Updating data..");
    update();

  }.bind(this));

}



function showWeather(data) {

  try {
    weather = data.weather;
    log("showWeather called");
    var sr = new Date(weather.sunrise);
    var ss = new Date(weather.sunset);
    var mr = new Date(weather.moonrise);
    var ms = new Date(weather.moonset);
    var card = new UI.Card({
      title: "Weather Details",
      scrollable: true,
      body: "Cloud %: " + weather.cloud + "\n" +
        "Temp: " + weather.temperature + "\n" +
        "Rain (mm): " + weather.rain + "\n" +
        "Fog %: " + weather.fog + "\n" +
        "Sunrise: " + ("0" + sr.getHours()).slice(-2) + ":" + ("0" + sr.getMinutes()).slice(-2) + "\n" +
        "Sunset: " + ("0" + ss.getHours()).slice(-2) + ":" + ("0" + ss.getMinutes()).slice(-2) + "\n" +
        "Moonrise: " + ("0" + mr.getHours()).slice(-2) + ":" + ("0" + mr.getMinutes()).slice(-2) + "\n" +
        "Moonset: " + ("0" + ms.getHours()).slice(-2) + ":" + ("0" + ms.getMinutes()).slice(-2) + "\n" +
        "Phase: " + weather.moonphase
    });
    card.show();
  } catch (ex) {
    log(ex);
  }
}

function log(text) {
  if (debug === true) {
    console.log(text);
  }
}
