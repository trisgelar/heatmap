const render = data => {
	const width = 3 * Math.ceil(data.monthlyVariance.length / 12);
  const height = 33 * 12;
  const fontSize = 10;
  const padding = { left: 9 * fontSize, right: 9 * fontSize, top: 1 * fontSize, bottom: 8 * fontSize };

  data.monthlyVariance.forEach(d => d.month -=1);

  const description = d3.select("#description")
    .append("h2")
    .html(`${data.monthlyVariance[0].year} ${data.monthlyVariance[data.monthlyVariance.length - 1].year} : base temperature ${data.baseTemperature} &#8451;`);

  // tooltip
  const tip = d3.tip()
    .attr("class", "d3-tip")
    .attr("id", "tooltip")
    .html(d => d)
    .direction("n")
    .offset([-10, 0]);

  const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", width + padding.left + padding.right)
    .attr("height", height + padding.top + padding.bottom)
    .call(tip);

  // yAxis
  const yScale = d3.scaleBand()
    .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    .rangeRound([0, height])
    .padding(0);
  const yAxis = d3.axisLeft()
    .scale(yScale)
    .tickValues(yScale.domain())
    .tickFormat(d => {
      const date = new Date(0);
      date.setUTCMonth(d);
      return d3.utcFormat("%B")(date);
    })
    .tickSize(10, 1);

  svg.append("g")
    .classed("y-axis", true)
    .attr("id", "y-axis")
    .attr("transform", `translate(${padding.left},${padding.top})`)
    .call(yAxis)
    .append("text")
    .text("Months")
    .style("text-anchor", "middle")
    .attr("transform", `translate(${-7 * fontSize},${height / 2}) rotate(-90)`);

  // xAxis
  const xScale = d3.scaleBand()
    .domain(data.monthlyVariance.map(d => d.year))
    .rangeRound([0, width])
    .padding(0);
  const xAxis = d3.axisBottom()
    .scale(xScale)
    .tickValues(xScale.domain().filter(function (year) {
      //set ticks to years divisible by 10
      return year % 10 === 0;
    }))
    .tickFormat(d => {
      const date = new Date(0);
      date.setUTCFullYear(d);
      return d3.utcFormat("%Y")(date);
    })
    .tickSize(10, 1);

  svg.append("g")
    .classed("x-axis", true)
    .attr("id", "x-axis")
    .attr("transform", `translate(${padding.left},${height + padding.top})`)
    .call(xAxis)
    .append("text")
    .text("Years")
    .style("text-anchor", "middle")
    .attr("transform", `translate(${width / 2},${3 * fontSize}) rotate(-90)`);

  // heatmap
  const variance = data.monthlyVariance.map(d => d.variance);
  const tempRange = [data.baseTemperature + Math.min.apply(null, variance), data.baseTemperature + Math.max.apply(null, variance)];

  const colorbrewer = {
    RdYlBu: {
      0: ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#ffffff','#e0e0e0','#bababa','#878787','#4d4d4d','#1a1a1a']
    }
  };

  const lColor = colorbrewer.RdYlBu[0].reverse();
  const lWidth = 400;
  const lHeight = 300 / lColor.length;

  const lTresh = d3.scaleThreshold()
    .domain(function (min, max, count) {
      let array = [];
      let step = (max - min) / count;
      let base = min;
      for (let i = 1; i < count; i++) {
        array.push(base + i * step);
      }
      return array;
    }(tempRange[0], tempRange[1], lColor.length))
    .range(lColor);

  const lX = d3.scaleLinear()
    .domain([tempRange[0], tempRange[1]])
    .range([0, lWidth]);

  const lAxis = d3.axisBottom()
    .scale(lX)
    .tickSize(10, 0)
    .tickValues(lTresh.domain())
    .tickFormat(d3.format(".1f"));

  const legend = svg.append("g")
    .classed("legend", true)
    .attr("id", "legend")
    .attr("transform", `translate(${padding.left},${(padding.top + height + padding.bottom - 2 * lHeight)})`);

  legend.append("g")
    .selectAll("rect")
    .data(lTresh.range().map(color => {
      let d = lTresh.invertExtent(color);
      if (d[0] == null) d[0] = lX.domain()[0];
      if (d[1] == null) d[1] = lX.domain()[1];
      return d;
    }))
    .enter()
    .append("rect")
    .attr("fill", (d,i) => {
      return lTresh(d[0])
    })
    .attr("x", (d, i) => lX(d[0]))
    .attr("y", 0)
    .attr("width", (d,i) => lX(d[1]) - lX(d[0]))
    .attr("height", lHeight);

  legend.append("g")
    .attr("transform", `translate(${0},${lHeight})`)
    .call(lAxis);

  const map = svg.append("g")
    .classed("map", true)
    .attr("transform", `translate(${padding.left}, ${padding.top})`)
    .selectAll("rect")
    .data(data.monthlyVariance)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("data-month", d => d.month)
    .attr("data-year", d => d.year)
    .attr("data-temp", d => data.baseTemperature + d.variance)
    .attr("x", (d, i) => xScale(d.year))
    .attr("y", (d, i) => yScale(d.month))
    .attr("width", (d,i) => xScale.bandwidth(d.year))
    .attr("height", (d,i) => yScale.bandwidth(d.month))
    .attr("fill", (d,i) => lTresh(data.baseTemperature + d.variance));

  map.on("mouseover", d => {
    const date = new Date(d.year, d.month);
    const str = `<span class='date'>${d3.timeFormat("%Y - %B")(date)}</span><br /><span class='temperature'>${d3.format(".1f")(data.baseTemperature + d.variance)}</span><br /><span class='variance'>${d3.format("+.1f")(d.variance)}&#8451;</span><br />`;
    tip.attr("data-year", d.year)
    tip.show(str);
  }).on("mouseout", tip.hide);
} 

document.addEventListener('DOMContentLoaded', function(){
	const data_source = "https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json"

    const req=new XMLHttpRequest();
    req.open("GET",data_source,true);
    req.send();
    req.onload = function(){
    	const json = JSON.parse(req.responseText);
      render(json);
	};	
});