var margin = {
    top: 20,
    right: 30,
    bottom: 20,
    left: 30
};
var width  = document.body.clientWidth - margin.left - margin.right;
var height = document.body.clientHeight - margin.top - margin.bottom - 40;

var parseDate = d3.time.format.utc("%Y-%m-%d %H:%M:%S").parse;
var dateFormat = d3.time.format("%d / %m");

// Don't use .time scale on x for now, it lumps together session data on the
// same date. Need to find a way to tweak it someday.
// var x = d3.time.scale().range([0, width]);
var x = d3.scale.ordinal().rangeRoundPoints([0, width], 0);
var y = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .tickFormat(function(d) {
        return dateFormat(d);
    })
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var color = d3.scale.category10();

var svg = d3.select("body").append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var varNames = [
    "average_power_forehands",
    "average_power_backhands",
    "average_effect_level_forehands_lifted",

    "average_power_serves",
    "average_effect_level_serves",

    "technical",
];

color.domain(varNames);

function buildValuesMap(name, d) {
    if (!d.date) {
        console.error(d);
    }
    if (name == 'percentage_forcehands') {

    }
    return {
        type: d.type,  // Used to differenciate matches from training on the points.
        name: name,  // Repeated for convenience, used when setting color on the points.
        date: d.date,  // x.
        percentage: +d[name],  // y.
    };
}

function buildAndFilterValuesMap(name, data) {
    return data.filter(function(d) {
        // Don't include data with 0 values, those are probably
        // not reliable.
        return +d[name] > 0;
    }).map(buildValuesMap.bind(null, name));
}

function buildGraph(error, data_mat, data_rik) {
    // Our session dates vary widly. Because we sometimes do 2-3 sessions the
    // same day, we don't use a linear scale for the y-axis, but we still want
    // to be able to group the data together. To do that, we round each date to
    // the nearest 15 minutes window.
    // This is horribly inefficient, doesn't take DST changes and other weird
    // stuff into account, but should be enough for our needs.
    var dates = [];

    // d3.js sets transform everything to strings, which we don't want, so
    // let's remove duplicate values ourselves.
    function arrayFirstUnique(array) {
        return array.filter(function (a, b, array) {
            // keeps first occurrence.
            return array.indexOf(a) === b;
        });
    }

    function dateSort(a, b) {
        return a - b;
    }

    function clampDate(d) {
        // First, get rid of seconds.
        var date = d3.time.minute.round(parseDate(d.start_at));
        var newMinutes = Math.round(date.getMinutes() / 15) * 15;
        if (newMinutes === 60) {
            date.setHours(date.getHours() + 1)
        }
        date.setMinutes(newMinutes);
        d.date = date;
        dates.push(d.date);
    }
    data_mat.forEach(clampDate);
    data_rik.forEach(clampDate);
    dates = arrayFirstUnique(dates).sort(dateSort);

    var seriesData = varNames.map(function(name) {
        return {
            name: name,
            values: buildAndFilterValuesMap(name, data_mat),
            values_rik: buildAndFilterValuesMap(name, data_rik),
        };
    });

    x.domain(dates);
    y.domain([
        d3.min(seriesData, function(s) {
            return d3.min(s.values.concat(s.values_rik), function(v) {
                return v.percentage - 1;
            });
        }),
        d3.max(seriesData, function(s) {
            return d3.max(s.values.concat(s.values_rik), function(v) {
                return v.percentage + 1;
            });
        })
    ]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)

    var line = d3.svg.line()
        .interpolate("cardinal")
        .x(function (d) { return x(d.date); })
        .y(function (d) { return y(d.percentage); });

    var series = svg.selectAll(".series")
        .data(seriesData)
        .enter().append("g")
        .attr("class", function(d) { return "series " + d.name; });

    series.append("path")
        .attr("class", "line mat")
        .attr("d", function (d) { return line(d.values); })
        .style("stroke", function (d) { return color(d.name); })

    series.append("path")
        .attr("class", "line rik")
        .attr("d", function (d) { return line(d.values_rik); })
        .style("stroke", function (d) { return color(d.name); })

    series.selectAll(".points")
        .data(function (d) { return d.values; })
        .enter().append("circle")
        .attr("class", function(d) { return "point mat " + d.type; })
        .attr("cx", function (d) { return x(d.date); })
        .attr("cy", function (d) { return y(d.percentage); })
        .attr("r", function(d) { return (d.type == "training") ? "4px" : "6px";})
        .style("fill", function (d) { return color(d.name); })

    series.selectAll(".points_rik")
        .data(function (d) { return d.values_rik; })
        .enter().append("circle")
        .attr("class", function(d) { return "point rik " + d.type; })
        .attr("cx", function (d) { return x(d.date); })
        .attr("cy", function (d) { return y(d.percentage); })
        .attr("r", function(d) { return (d.type == "training") ? "4px" : "6px";})
        .style("fill", function (d) { return color(d.name); })
}

queue()
    .defer(d3.json, 'evolution_mat.json')
    .defer(d3.json, 'evolution_rik.json')
    .await(buildGraph);
