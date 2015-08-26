var margin = {
    top: 20,
    right: 30,
    bottom: 20,
    left: 30
};
var width  = document.body.clientWidth - margin.left - margin.right;
var height = document.body.clientHeight - margin.top - margin.bottom - 40;

var parseDate = d3.time.format.utc("%Y-%m-%d %H:%M:%S").parse;
var dateFormat = d3.time.format("%d/%m");

var x = d3.scale.ordinal().rangeRoundPoints([0, width], 0);
var y = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .tickFormat(function(d) {
        if (d.indexOf('(') > -1) { return ''; } else { return d; }
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
    return {
        type: d.type,  // Used to differenciate matches from training.
        name: name,  // Repeated for convenience, used when setting color.
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

function extractDates(dates, data) {
    var currentDate;
    var sessionNumber = 1;
    var lastDate;

    for (var i = 0; i < data.length; i++) {
        // Only keep the date part... Unless we already saw that date.
        currentDate = dateFormat(parseDate(data[i].start_at));
        if (currentDate === lastDate) {
            sessionNumber++;
            data[i].date = currentDate + ' (' + sessionNumber + ')';
        } else {
            sessionNumber = 1;
            data[i].date = currentDate;
        }
        dates.push(data[i].date);
        lastDate = currentDate;
    }
}

function buildGraph(error, data_mat, data_rik) {
    // Our session dates vary widly. Because we sometimes do 2-3 sessions the
    // same day, we can't use a linear time scale for the y-axis - but we still
    // want to be able to group individual data together.
    // To do that, build a custom property holding the date and the session
    // number: on dates where we don't play together, there simply won't be any
    // data for one of the players, but that's fine.
    var dates = [];
    extractDates(dates, data_mat);
    extractDates(dates, data_rik);

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
        .call(yAxis);

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
        .style("stroke", function (d) { return color(d.name); });

    series.append("path")
        .attr("class", "line rik")
        .attr("d", function (d) { return line(d.values_rik); })
        .style("stroke", function (d) { return color(d.name); });

    series.selectAll(".points")
        .data(function (d) { return d.values; })
        .enter().append("circle")
        .attr("class", function(d) { return "point mat " + d.type; })
        .attr("cx", function (d) { return x(d.date); })
        .attr("cy", function (d) { return y(d.percentage); })
        .attr("r", function(d) {
            return (d.type == "training") ? "4px" : "6px";})
        .style("fill", function (d) { return color(d.name); });

    series.selectAll(".points_rik")
        .data(function (d) { return d.values_rik; })
        .enter().append("circle")
        .attr("class", function(d) { return "point rik " + d.type; })
        .attr("cx", function (d) { return x(d.date); })
        .attr("cy", function (d) { return y(d.percentage); })
        .attr("r", function(d) {
            return (d.type == "training") ? "4px" : "6px";})
        .style("fill", function (d) { return color(d.name); });
}

queue()
    .defer(d3.json, 'evolution_mat.json')
    .defer(d3.json, 'evolution_rik.json')
    .await(buildGraph);
