document.addEventListener('DOMContentLoaded', function() {
  // ----------------------------
  // Global variables: store gauge charts and data tables for each sensor
  let gaugeCharts = {};
  let gaugeDataTables = {};

  // For modal (to display sensor's real-time line chart)
  let modalChart;

  // Configuration for gauges
  const gaugeConfig = {
    width: 250,
    height: 200,
    redFrom: 80,
    redTo: 100,
    yellowFrom: 50,
    yellowTo: 80,
    minorTicks: 5,
    max: 100
  };

  // ----------------------------
  // Initialize Google Charts for Gauges
  google.charts.load('current', {packages:['gauge']});
  google.charts.setOnLoadCallback(initGauges);

  function initGauges() {
    const sensors = ['volt', 'rotate', 'pressure', 'vibration'];
    sensors.forEach(sensor => {
      gaugeDataTables[sensor] = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        [sensor.toUpperCase(), 0]
      ]);
      gaugeCharts[sensor] = new google.visualization.Gauge(document.getElementById(`gauge_${sensor}_chart`));
      gaugeCharts[sensor].draw(gaugeDataTables[sensor], gaugeConfig);
    });
    // Bind click event: clicking a gauge shows its real-time line chart in a modal
    document.querySelectorAll('.gauge').forEach(elem => {
      elem.addEventListener('click', function() {
        const sensor = this.getAttribute('data-sensor');
        openModal(sensor);
      });
    });
  }

  // Update a specific sensor's gauge value
  function updateGauge(sensor, value) {
    if (gaugeDataTables[sensor]) {
      gaugeDataTables[sensor].setValue(0, 1, value);
      gaugeCharts[sensor].draw(gaugeDataTables[sensor], gaugeConfig);
    }
  }

  // ----------------------------
  // Initialize historical line charts for each sensor using Google Charts (LineChart)
  let lineCharts = {};
  let lineChartData = {};
  const lineChartOptions = {
    curveType: 'function',
    legend: { position: 'bottom' },
    backgroundColor: 'transparent',
    hAxis: { textStyle: { color: '#fff' } },
    vAxis: { textStyle: { color: '#fff' } },
    titleTextStyle: { color: '#fff' }
  };
  let sensors = ['volt', 'rotate', 'pressure', 'vibration'];
  // History data for each sensor
  let historyData = {
    volt: [],
    rotate: [],
    pressure: [],
    vibration: []
  };

  google.charts.load('current', {packages: ['corechart']});
  google.charts.setOnLoadCallback(initLineCharts);

  function initLineCharts() {
    sensors.forEach(sensor => {
      lineChartData[sensor] = new google.visualization.DataTable();
      lineChartData[sensor].addColumn('string', 'Time');
      lineChartData[sensor].addColumn('number', sensor.toUpperCase());
      // Initially empty
      lineChartData[sensor].addRows(historyData[sensor]);
      lineCharts[sensor] = new google.visualization.LineChart(document.getElementById(`lineChart_${sensor}`));
      lineCharts[sensor].draw(lineChartData[sensor], Object.assign({}, lineChartOptions, { title: sensor.toUpperCase() + " History" }));
    });
  }

  function updateLineChart(sensor) {
    if (lineChartData[sensor]) {
      lineChartData[sensor].removeRows(0, lineChartData[sensor].getNumberOfRows());
      lineChartData[sensor].addRows(historyData[sensor]);
      lineCharts[sensor].draw(lineChartData[sensor], Object.assign({}, lineChartOptions, { title: sensor.toUpperCase() + " History" }));
    }
  }

  // ----------------------------
  // Simulation: generate random data periodically and update dashboard & history charts
  let simulationInterval = setInterval(simulateData, 3000);
  let isPaused = false;
  let playbackInterval;

  function simulateData() {
    const simulatedData = {
      sensor: {
        volt: (Math.random() * 100).toFixed(2),
        rotate: (Math.random() * 100).toFixed(2),
        pressure: (Math.random() * 100).toFixed(2),
        vibration: (Math.random() * 100).toFixed(2)
      },
      prediction: Math.random() > 0.5 ? "Normal" : "Fault",
      response: Math.random() > 0.5 ? "No Action" : "Activate Alarm"
    };
    window.updateDashboard(simulatedData);
    logDebug("Simulated data: " + JSON.stringify(simulatedData));

    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
    sensors.forEach(sensor => {
      historyData[sensor].push([timeStr, parseFloat(simulatedData.sensor[sensor])]);
      if (historyData[sensor].length > 10) {
        historyData[sensor].shift();
      }
      updateLineChart(sensor);
    });
  }

  // ----------------------------
  // Playback Controls for Real-Time Line Charts
  document.getElementById("btnPause").addEventListener("click", function() {
    if (!isPaused) {
      clearInterval(simulationInterval);
      isPaused = true;
      logDebug("Simulation paused.");
    }
  });

  document.getElementById("btnResume").addEventListener("click", function() {
    if (isPaused) {
      simulationInterval = setInterval(simulateData, 3000);
      isPaused = false;
      logDebug("Simulation resumed.");
    }
  });

  document.getElementById("btnReplay").addEventListener("click", function() {
    clearInterval(simulationInterval);
    isPaused = true;
    logDebug("Starting replay...");
    // Replay historical data: clear charts and then replay each data point with delay
    let replayIndex = 0;
    // Create copies of history arrays
    let replayHistory = {};
    sensors.forEach(sensor => {
      replayHistory[sensor] = historyData[sensor].slice();
    });
    playbackInterval = setInterval(function() {
      if (replayIndex < replayHistory['volt'].length) {
        sensors.forEach(sensor => {
          // Use only data up to current replayIndex
          let partialData = replayHistory[sensor].slice(0, replayIndex + 1);
          historyData[sensor] = partialData; // update global history for chart update
          updateLineChart(sensor);
        });
        replayIndex++;
      } else {
        clearInterval(playbackInterval);
        logDebug("Replay finished.");
      }
    }, 1000);
  });

  // ----------------------------
  // Debug Log: record messages; fixed size when collapsed, expandable on button click
  function logDebug(msg) {
    const logDiv = document.getElementById("mqttLog");
    const p = document.createElement("p");
    p.textContent = msg;
    logDiv.appendChild(p);
    if (!logDiv.classList.contains("expanded") && logDiv.childNodes.length > 20) {
      logDiv.removeChild(logDiv.firstChild);
    }
  }
  const toggleDebugLog = document.getElementById("toggleDebugLog");
  toggleDebugLog.addEventListener("click", function() {
    const mqttLogDiv = document.getElementById("mqttLog");
    if (mqttLogDiv.classList.contains("expanded")) {
      mqttLogDiv.classList.remove("expanded");
      toggleDebugLog.textContent = "Show All";
    } else {
      mqttLogDiv.classList.add("expanded");
      toggleDebugLog.textContent = "Hide";
    }
  });

  // ----------------------------
  // Initialize particle background
  particlesJS("particles-js", {
    "particles": {
      "number": { "value": 60 },
      "color": { "value": "#ffffff" },
      "shape": { "type": "circle" },
      "opacity": { "value": 0.3 },
      "size": { "value": 4 },
      "line_linked": { "enable": true, "distance": 100, "color": "#ffffff", "opacity": 0.2, "width": 1 },
      "move": { "enable": true, "speed": 2 }
    },
    "interactivity": {
      "detect_on": "canvas",
      "events": { "onhover": { "enable": true, "mode": "repulse" } }
    }
  });

  // ----------------------------
  // Night Mode Toggle
  const toggleTheme = document.getElementById("toggleTheme");
  toggleTheme.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
  });

  // ----------------------------
  // Modal: Display sensor's real-time line chart on gauge click
  function openModal(sensor) {
    document.getElementById("modalTitle").textContent = sensor.toUpperCase() + " Real-Time Chart";
    // Prepare DataTable for modal chart using the history data for the sensor
    let modalChartData = new google.visualization.DataTable();
    modalChartData.addColumn('string', 'Time');
    modalChartData.addColumn('number', sensor.toUpperCase());
    modalChartData.addRows(historyData[sensor]);
    let modalChartOptions = Object.assign({}, lineChartOptions, { title: sensor.toUpperCase() + " Real-Time Chart" });
    let modalChartInstance = new google.visualization.LineChart(document.getElementById('modalChart'));
    modalChartInstance.draw(modalChartData, modalChartOptions);
    document.getElementById('modal').style.display = 'block';
  }

  // Close Modal: Bind close button event
  const modalClose = document.getElementById('modalClose');
  if (modalClose) {
    modalClose.addEventListener('click', function() {
      console.log("Modal close button clicked");
      document.getElementById('modal').style.display = 'none';
    });
  } else {
    console.error("modalClose element not found");
  }

  // ----------------------------
  // Global Interface: Update Dashboard Data
  window.updateDashboard = function(data) {
    if (data.sensor) {
      if (data.sensor.volt !== undefined) updateGauge("volt", parseFloat(data.sensor.volt));
      if (data.sensor.rotate !== undefined) updateGauge("rotate", parseFloat(data.sensor.rotate));
      if (data.sensor.pressure !== undefined) updateGauge("pressure", parseFloat(data.sensor.pressure));
      if (data.sensor.vibration !== undefined) updateGauge("vibration", parseFloat(data.sensor.vibration));
    }
    if (data.prediction !== undefined) {
      // Dynamic Fault Prediction: Emoji/icon and flashing effect if "Fault"
      const predText = data.prediction === "Fault" ? "⚠️ Fault" : "✅ Normal";
      document.getElementById("predictionStatus").textContent = predText;
      const predCard = document.querySelector('.prediction-card');
      if (predCard) {
        predCard.classList.toggle("fault", data.prediction === "Fault");
      }
    }
    if (data.response !== undefined) {
      document.getElementById("responseStatus").textContent = data.response;
      const respCard = document.querySelector('.response-card');
      if (respCard) {
        respCard.classList.toggle("response-alert", data.response === "Activate Alarm");
      }
      // Play sound if response is "Activate Alarm"
      if (data.response === "Activate Alarm") {
        const alarmSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        alarmSound.play();
      }
    }
  };

  // ----------------------------
  // Draggable Layout: Make sensor gauges draggable using SortableJS
  Sortable.create(document.querySelector('.gauges'), {
    animation: 150,
    ghostClass: 'sortable-ghost'
  });
});
