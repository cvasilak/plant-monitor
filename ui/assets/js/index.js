class PlantPage {

  constructor(swimUrl) {
    this.swimUrl = swimUrl;
    this.links = {};
    this.plantList = {};
    this.plantListSynced = false;
    this.plantListLink = null;
    this.plantDataLink = null;
    this.plantInfo = null;
    this.plantAlerts = [];

    this.sensorList = [];
    this.sensorListSynced = false;

    this.tween = swim.Transition.duration(300);

    this.gaugePanel = null;
    this.mainGauge = null;
    this.ledGauge = null;
    this.soilDial = null;
    this.lightDial = null;
    this.tempDial = null;

    this.soilColor = swim.Color.rgb(14, 173, 105);
    this.lightColor = swim.Color.rgb(255, 210, 63);
    this.tempColor = swim.Color.rgb(238, 66, 102);

    this.selectedPlant = null;
    this.charts = [];
    this.plots = [];

    this.tempImg = new Image();
    this.blinkAsyncId = null;
    this.patternAsyncId = null;
  }

  /**
   * class init. setup swim links and deafault objects/variable 
   * and then call start()
   */
  initialize() {

    // load list of animations saved in swim animationService
    this.plantListLink = swim.nodeRef(this.swimUrl, '/aggregationService').downlinkMap().laneUri('plantList')
      .didUpdate((key, value) => {
        if (!document.getElementById(key.stringValue())) {
          this.plantList[key.stringValue()] = value.toObject();
          const newDiv = document.createElement("div");
          newDiv.id = key.stringValue();
          newDiv.innerText = this.plantList[key.stringValue()].name;

          document.getElementById("plantListingDiv").appendChild(newDiv);
        }
      })
      .didRemove((key) => {
        delete this.plantList[key.stringValue()];
        const removeDiv = document.getElementById(key.stringValue());
        if (removeDiv) {
          document.getElementById("plantListingDiv").removeChild(removeDiv);
        }
      })
      .didSync(() => {
        // if (!document.getElementById("none")) {
        //   const newDiv = document.createElement("div");
        //   newDiv.id = 'none';
        //   newDiv.innerText = "None";

        //   document.getElementById("plantListingDiv").appendChild(newDiv);

        // }

        if (!this.plantListSynced) {
          this.plantListSynced = true;
          this.selectPlant(Object.keys(this.plantList)[0]);
        }
        this.alertListLink.open();
      });

    this.alertListDiv = document.getElementById("alertListingDiv");
    this.alertListLink = swim.nodeRef(this.swimUrl, '/aggregationService').downlinkMap().laneUri('plantAlerts')
      .didUpdate((key, value) => {
        let alertRow = document.getElementById(`${key.stringValue()}-alertrow`);
        if (!alertRow) {
          alertRow = document.createElement("div");
          alertRow.setAttribute("id", `${key.stringValue()}-alertrow`);
          this.alertListDiv.appendChild(alertRow);

        }
        const plant = this.plantList[key.stringValue()];
        if (plant) {
          alertRow.innerHTML = `<span>${plant.name}</span> <b>${value.numberValue()}</b>`;
        } else {
          console.info(key, this.plantList);
        }


        // console.info(key, value);
      })
      .didRemove((key) => {
        console.info(key);
        let alertRow = document.getElementById(`${key.stringValue()}-alertrow`);
        if (alertRow) {
          this.alertListDiv.removeChild(alertRow);

        }

      })

    this.start();
  }

  /**
   * Start up the LED Animator page
   */
  start() {
    this.initPage();
    this.plantListLink.open()

    // const mainElem = document.getElementsByTagName("main")[0];
    // mainElem.appendChild(this.tempImg);

  }

  initPage() {

    document.getElementById("plantListingDiv").onclick = (evt) => {
      this.handlePlantListClick(evt);

    }
  }

  handlePlantListClick(evt) {
    console.info(evt.target.id);
    this.selectPlant(evt.target.id)
  }

  selectPlant(plantId) {
    console.info("Select Plant:", plantId);
    this.removeCharts();
    // open all our swim links
    for (let linkLKey in this.links) {
      console.info("close link", linkLKey);
      this.links[linkLKey].close();
      this.links[linkLKey] = null;
    }
    document.getElementById("pressureValue").innerHTML = ``;
    document.getElementById("humidityValue").innerHTML = ``;
    this.links = {};
    this.sensorList = {};
    this.sensorListSynced = false;

    const plant = this.plantList[plantId];
    this.selectedPlant = plant;
    if (!plant) {
      return;
    }

    this.drawCharts();

    this.blinkAsyncId = null;
    this.patternAsyncId = null;

    document.getElementById("plantNameHeader").innerText = plant.name;
    // this.mainGauge.title(new swim.TextRunView(plant.name).font("20px sans-serif"))
    this.links['plantInfo'] = swim.nodeRef(this.swimUrl, `/plant/${plantId}`).downlinkValue().laneUri('info')
      .didSet((newData, oldData) => {
        if (newData.isDefined()) {
          this.plantInfo = newData.toObject();
        }

      })
    this.links['blinkAsyncId'] = swim.nodeRef(this.swimUrl, `/sensor/${plantId}/blinkAction`).downlinkValue().laneUri('asyncId')
      .didSet((newData, oldData) => {
        if (newData.isDefined()) {
          this.blinkAsyncId = newData.stringValue();
        }

      })

    this.links['patternAsyncId'] = swim.nodeRef(this.swimUrl, `/sensor/${plantId}/blinkPattern`).downlinkValue().laneUri('asyncId')
      .didSet((newData, oldData) => {
        if (newData.isDefined()) {
          this.patternAsyncId = newData.stringValue();
        }

      })

      this.links['alertList'] = swim.nodeRef(this.swimUrl, `/plant/${plantId}`).downlinkMap().laneUri('alertList')
      .didUpdate((key, value) => {
        this.plantAlerts[key.stringValue()] = value;
        this.mainGauge.title(new swim.TextRunView(`${Object.keys(page.plantAlerts).length} Alerts`).font("20px sans-serif"))
      })
      .didRemove((key) => {
        delete this.plantAlerts[key.stringValue()];
        this.mainGauge.title(new swim.TextRunView(`${Object.keys(page.plantAlerts).length} Alerts`).font("20px sans-serif"))
      });      

    this.links['sensorList'] = swim.nodeRef(this.swimUrl, `/plant/${plantId}`).downlinkMap().laneUri('sensorList')
      .didUpdate((key, value) => {
        this.sensorList[key.stringValue()] = value.stringValue();
      })
      .didSync(() => {
        if (!this.sensorListSynced) {
          this.sensorListSynced = true;
          for (let sensor in this.sensorList) {
            this.links[`sensor-${sensor}-latest`] = swim.nodeRef(this.swimUrl, `/sensor/${plantId}/${sensor}`).downlinkValue().laneUri('latest')
              .didSet((newValue, oldValue) => {
                switch (sensor) {
                  case "soil":
                    this.soilDial.value(newValue.numberValue(), this.tween);
                    const labelValue1 = newValue.stringValue();
                    this.soilDial.label(`${labelValue1}%`);
                    break;
                  case "light":
                    this.lightDial.value(newValue.numberValue(), this.tween);
                    const labelValue2 = newValue.stringValue();
                    this.lightDial.label(`${labelValue2}%`);
                    break;
                  case "tempAvg":
                    this.tempDial.value(newValue.numberValue(), this.tween);
                    this.tempDial.label(`${newValue.stringValue()}°C`);
                    break;
                  case "pressure":
                    // this.tempDial.value(newValue.numberValue(), this.tween);
                    // this.tempDial.label(`${newValue.stringValue()}°C`);
                    document.getElementById("pressureValue").innerHTML = `${newValue.stringValue()} mb`;
                    break;
                  case "humidity":
                    // this.tempDial.value(newValue.numberValue(), this.tween);
                    // this.tempDial.label(`${newValue.stringValue()}°C`);
                    document.getElementById("humidityValue").innerHTML = `${newValue.stringValue()}%`;
                    break;

                }
              })
              .open();

            this.links[`sensor-${sensor}-history`] = swim.nodeRef(this.swimUrl, `/sensor/${plantId}/${sensor}`).downlinkMap().laneUri('shortHistory')
              .didUpdate((timestamp, sensorvalue) => {
                if (this.plots[sensor]) {
                  this.plots[sensor].insertDatum({ x: timestamp.numberValue(), y: sensorvalue.numberValue(), opacity: 1 });
                }

              })
              .didRemove((timestamp, sensorvalue) => {
                if (this.plots[sensor]) {
                  this.plots[sensor].removeDatum(timestamp.numberValue());
                }
              })
              .open();

          }

        }
      });

    // open all our swim links
    for (let linkLKey in this.links) {
      console.info("open link", linkLKey);
      this.links[linkLKey].open();
    }

  }

  removeCharts() {
    if (this.mainGauge !== null) {
      // this.mainGauge
      this.mainGauge.removeAll();
      this.mainGauge = null;
      this.charts['light'].parentView.removeAll();
      this.charts['soil'].parentView.removeAll();
      this.charts['tempAvg'].parentView.removeAll();
      this.charts = [];
      this.plots = [];
    }

  }

  drawCharts() {
    if (this.gaugePanel === null) {
      this.gaugePanel = new swim.HtmlAppView(document.getElementById("soilGauge"));
    }
    const canvas = this.gaugePanel.append("canvas");
    const count = 3;

    // Create a new gauge view
    this.mainGauge = new swim.GaugeView()
      .innerRadius(swim.Length.pct(20))
      .outerRadius(swim.Length.pct(50))
      .dialColor(swim.Color.rgb(100, 100, 100, 0.2))
      // .title(new swim.TextRunView("Plant 1").font("20px sans-serif"))
      .font("14px sans-serif")
      .textColor("#ffffff")
      .cornerRadius(4)
      .dialSpacing(3)
      .startAngle(swim.Angle.rad((count === 1 ? -Math.PI / 2 : 3 * Math.PI / 4)))
      .sweepAngle(swim.Angle.rad((count === 1 ? 2 * Math.PI : 3 * Math.PI / 2)))
    // and append it to the canvas.

    this.soilDial = new swim.DialView()
      .total(100)
      .value(0) // initialize to zero so the dial will tween in
      .meterColor(this.soilColor)
      .label(new swim.TextRunView().textColor("#4a4a4a"));

    this.lightDial = new swim.DialView()
      .total(100)
      .value(0) // initialize to zero so the dial will tween in
      .meterColor(this.lightColor)
      .label(new swim.TextRunView().textColor("#4a4a4a"));

    this.tempDial = new swim.DialView()
      .total(100)
      .value(0) // initialize to zero so the dial will tween in
      .meterColor(this.tempColor)
      .label(new swim.TextRunView().textColor("#4a4a4a"));

    this.mainGauge.append(this.soilDial);
    this.mainGauge.append(this.lightDial);
    this.mainGauge.append(this.tempDial);

    canvas.append(this.mainGauge);

    const chartList = ['tempAvg', 'light', 'soil'];

    for (let chartKey of chartList) {
      const chartPanel = new swim.HtmlAppView(document.getElementById(`${chartKey}Chart`));
      const chartCanvas = chartPanel.append("canvas");


      const clr = "#fff";
      this.charts[chartKey] = new swim.ChartView()
        .bottomAxis("time")
        .leftAxis("linear")
        .bottomGesture(false)
        .leftDomainPadding([0, 0])
        .topGutter(0)
        .bottomGutter(20)
        .leftGutter(25)
        .rightGutter(0)
        .font("12px \"Open Sans\"")
        .domainColor(clr)
        .tickMarkColor(clr)
        .textColor(clr);

      this.plots[chartKey] = new swim.LineGraphView()
        .strokeWidth(2);

      switch (chartKey) {
        case 'soil':
          this.plots[chartKey].stroke(this.soilColor);
          break;
        case 'light':
          this.plots[chartKey].stroke(this.lightColor);
          break;
        case 'tempAvg':
          this.plots[chartKey].stroke(this.tempColor);
          break;

      }

      this.charts[chartKey].addPlot(this.plots[chartKey]);

      chartCanvas.append(this.charts[chartKey]);

    }
  }

  blinkLed() {
    if (this.selectedPlant !== null && this.blinkAsyncId) {
      var xhttp = new XMLHttpRequest();
      let msg = JSON.stringify({ "method": "POST", "uri": "/3201/0/5850" });
      let str = `https://api.us-east-1.mbedcloud.com/v2/device-requests/${this.selectedPlant.id}?async-id=${this.blinkAsyncId}`

      xhttp.open('POST', str, true)
      xhttp.setRequestHeader("Content-type", "application/json");
      xhttp.setRequestHeader("Authorization", "Bearer ak_1MDE3MjI5MWVlZWVhN2ExZTNkYzEyYWU3MDAwMDAwMDA01722982f11bceef6448061800000000hHrp7q2Ow4TeYe9x5SkkOCJ28GBIRThK");
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status == 202) {
            console.info("Command sent");
          } else {
            console.info("could not send command", this)
          }
        }
      };
      xhttp.send(msg);
    } else {
      alert("Select a device");
    }
  }

  changePattern() {
    if (this.selectedPlant !== null && this.patternAsyncId) {
      const newPattern = prompt("Enter new pattern");

      var xhttp = new XMLHttpRequest();
      let msg = `{"method": "PUT", "uri": "/3201/0/5853", "accept": "text/plain", "content-type": "text/plain", "payload-b64": "${btoa(newPattern)}"}`;
      let str = `https://api.us-east-1.mbedcloud.com/v2/device-requests/${this.selectedPlant.id}?async-id=${this.patternAsyncId}`

      xhttp.open('POST', str, true)
      xhttp.setRequestHeader("Content-type", "application/json");
      xhttp.setRequestHeader("Authorization", "Bearer ak_1MDE3MjI5MWVlZWVhN2ExZTNkYzEyYWU3MDAwMDAwMDA01722982f11bceef6448061800000000hHrp7q2Ow4TeYe9x5SkkOCJ28GBIRThK");
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status == 202) {
            console.info("Command sent");
          } else {
            console.info("could not send command", this)
          }
        }
      };
      xhttp.send(msg);
    } else {
      alert("Select a device");
    }
  }
}
