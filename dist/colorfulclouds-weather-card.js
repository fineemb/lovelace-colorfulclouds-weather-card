console.info("%c  WEATHER CARD  \n%c  Version 1.1 ",
"color: orange; font-weight: bold; background: black", 
"color: white; font-weight: bold; background: dimgray");

const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;

const windDirections = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
  "N"
];

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

function hasConfigOrEntityChanged(element, changedProps) {
  if (changedProps.has("_config")) {
    return true;
  }

  const oldHass = changedProps.get("hass");
  if (oldHass) {
    return (
      oldHass.states[element._config.entity] !==
        element.hass.states[element._config.entity] ||
      oldHass.states["sun.sun"] !== element.hass.states["sun.sun"]
    );
  }

  return true;
}

class WeatherCard extends LitElement {
  static get properties() {
    return {
      _config: {},
      hass: {}
    };
  }

  static async getConfigElement() {
    await import("./weather-card-editor.js");
    return document.createElement("weather-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a weather entity");
    }
    this._config = config;
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <style>
          .not-found {
            flex: 1;
            background-color: yellow;
            padding: 8px;
          }
        </style>
        <ha-card>
          <div class="not-found">
            Entity not available: ${this._config.entity}
          </div>
        </ha-card>
      `;
    }

    const lang = this.hass.selectedLanguage || this.hass.language;

    const next_rising = new Date(
      this.hass.states["sun.sun"].attributes.next_rising
    );
    const next_setting = new Date(
      this.hass.states["sun.sun"].attributes.next_setting
    );

    return html`
      ${this.renderStyle()}
      <ha-card>
        <span
          class="icon bigger"
          style="background: none, url(/hacsfiles/lovelace-colorfulclouds-weather-card/icons/animated/${stateObj.attributes.skycon}.svg) no-repeat; background-size: contain;"
          >${stateObj.state}
        </span>
        ${
          this._config.name
            ? html`
                <span class="title"> ${this._config.name} </span>
              `
            : ""
        }
        <span class="temp"
          >${
            this.getUnit("temperature") == "°F"
              ? Math.round(stateObj.attributes.temperature)
              : stateObj.attributes.temperature
          }</span
        >
        <span class="tempc"> ${this.getUnit("temperature")}</span>
		<div>
		  <ul style="list-style:none;margin-top:4.5em;padding:0 0 0 14px;">
		    <li style="font-weight:bold;"><span class="ha-icon"
                ><ha-icon icon="mdi:camera-timer"></ha-icon
              ></span> ${stateObj.attributes.forecast_minutely}</li>
		    <li><span class="ha-icon"
                ><ha-icon icon="mdi:clock-outline"></ha-icon
              ></span>${stateObj.attributes.forecast_hourly}</li>
		  </ul>
		</div>
        <span>
          <ul class="variations">
            <li>
              <span class="ha-icon"
                ><ha-icon icon="mdi:water-percent"></ha-icon
              ></span>
              ${stateObj.attributes.humidity}<span class="unit"> % </span>
              <br />
              <span class="ha-icon"
                ><ha-icon icon="mdi:weather-windy"></ha-icon
              ></span>
              ${
                windDirections[
                  parseInt((stateObj.attributes.wind_bearing + 11.25) / 22.5)
                ]
              }
              ${stateObj.attributes.wind_speed}<span class="unit">
                ${this.getUnit("length")}/h
              </span>
              <br />
              <span class="ha-icon"
                ><ha-icon icon="mdi:weather-sunset-up"></ha-icon
              ></span>
              ${next_rising.toLocaleTimeString()}
            </li>
            <li>
              <span class="ha-icon"><ha-icon icon="mdi:gauge"></ha-icon></span
              >${stateObj.attributes.pressure}<span class="unit">
                ${this.getUnit("air_pressure")}
              </span>
              <br />
              <span class="ha-icon"
                ><ha-icon icon="mdi:weather-fog"></ha-icon
              ></span>
              ${stateObj.attributes.visibility}<span class="unit">
                ${this.getUnit("length")}
              </span>
              <br />
              <span class="ha-icon"
                ><ha-icon icon="mdi:weather-sunset-down"></ha-icon
              ></span>
              ${next_setting.toLocaleTimeString()}
            </li>
          </ul>
        </span>
        ${
          stateObj.attributes.forecast &&
          stateObj.attributes.forecast.length > 0
            ? html`
                <div class="forecast clear">
                  ${
                    stateObj.attributes.forecast.slice(0, 15).map(
                      daily => html`
                        <div class="day">
                          <span class="dayname"
                            >${
                              new Date(daily.datetime).toLocaleDateString(
                                lang,
                                {
                                  weekday: "short"
                                }
                              )
                            }</span
                          >
                          <br /><i
                            class="icon"
                            style="background: none, url(/hacsfiles/lovelace-colorfulclouds-weather-card/icons/animated/${daily.skycon}.svg) no-repeat; background-size: contain;"
                          ></i>
                          <br /><span class="highTemp"
                            >${daily.temperature}${
                              this.getUnit("temperature")
                            }</span
                          >
                          ${
                            typeof daily.templow !== 'undefined'
                              ? html`
                                  <br /><span class="lowTemp"
                                    >${daily.templow}${
                                      this.getUnit("temperature")
                                    }</span
                                  >
                                  <br /><span class="lowTemp"
                                    >${daily.precipitation}${
                                      this.getUnit("precipitation")
                                    }</span
                                  >
                                `
                              : ""
                          }
                        </div>
                      `
                    )
                  }
                </div>
              `
            : ""
        }
      </ha-card>
    `;
  }

  getUnit(measure) {
    const lengthUnit = this.hass.config.unit_system.length;
    switch (measure) {
      case "air_pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      default:
        return this.hass.config.unit_system[measure] || "";
    }
  }

  _handleClick() {
    fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }

  getCardSize() {
    return 3;
  }

  renderStyle() {
    return html`
      <style>
        ha-card {
          margin: auto;
          padding-top: 2.5em;
          padding-left: 1em;
          padding-right: 1em;
          position: relative;
        }

        .clear {
          clear: both;
        }

        .ha-icon {
          height: 18px;
          margin-right: 5px;
          color: var(--paper-item-icon-color);
        }

        .title {
          position: absolute;
          left: 3em;
          top: 0.6em;
          font-weight: 300;
          font-size: 3em;
          color: var(--primary-text-color);
        }
        .temp {
          font-weight: 300;
          font-size: 4em;
          color: var(--primary-text-color);
          position: absolute;
          right: 1em;
          top: 0.6em;
        }

        .tempc {
          font-weight: 300;
          font-size: 1.5em;
          vertical-align: super;
          color: var(--primary-text-color);
          position: absolute;
          right: 1em;
          margin-top: -14px;
          margin-right: 7px;
        }

        .variations {
          display: flex;
          flex-flow: row wrap;
          justify-content: space-between;
          font-weight: 300;
          color: var(--primary-text-color);
          list-style: none;
          margin-top: 1.5em;
          padding: 0;
        }

        .variations li {
          flex-basis: auto;
        }

        .variations li:first-child {
          padding-left: 1em;
        }

        .variations li:last-child {
          padding-right: 1em;
        }

        .unit {
          font-size: 0.8em;
        }

        .forecast {
          width: 100%;
          margin: 0 auto;
          display: flex;
          overflow-x: scroll;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
            border-radius: 3px;
            background: rgba(0,0,0,0.06);
            -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.08);
        }
        /* 滚动条滑块 */
        ::-webkit-scrollbar-thumb {
            border-radius: 3px;
            background: rgba(0,0,0,0.12);
            -webkit-box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
        }
        .day {
          display: block;
          width: 20%;
          flex:none;
          text-align: center;
          color: var(--primary-text-color);
          border-right: 0.1em solid #d9d9d9;
          line-height: 2;
          box-sizing: border-box;
          padding-bottom: 1em;
        }

        .dayname {
          text-transform: uppercase;
        }

        .forecast .day:first-child {
          margin-left: 0;
        }

        .forecast .day:nth-last-child(1) {
          border-right: none;
          margin-right: 0;
        }

        .highTemp {
          font-weight: bold;
        }

        .lowTemp {
          color: var(--secondary-text-color);
        }

        .icon.bigger {
          width: 10em;
          height: 10em;
          margin-top: -3em;
          position: absolute;
          left: 0em;
        }

        .icon {
          width: 50px;
          height: 50px;
          margin-right: 5px;
          display: inline-block;
          vertical-align: middle;
          background-size: contain;
          background-position: center center;
          background-repeat: no-repeat;
          text-indent: -9999px;
        }

        .weather {
          font-weight: 300;
          font-size: 1.5em;
          color: var(--primary-text-color);
          text-align: left;
          position: absolute;
          top: -0.5em;
          left: 6em;
          word-wrap: break-word;
          width: 30%;
        }
      </style>
    `;
  }
}
customElements.define("weather-card", WeatherCard);


class WeatherMoreInfo extends LitElement {
  static get properties() {
    return {
      _config: {},
      offset: { type: Number },
      x: { type: Number },
      grab: { type: Boolean },
      grabX: { type: Number },
      hass: {}
    };
  }

  static async getConfigElement() {
    await import("./weather-card-editor.js");
    return document.createElement("weather-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a weather entity");
    }
    this._config = config;
    this.offset = 0;
    this.grab = false;
    this.x = 0;
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <style>
          .not-found {
            flex: 1;
            background-color: yellow;
            padding: 8px;
          }
        </style>
        <ha-card>
          <div class="not-found">
            Entity not available: ${this._config.entity}
          </div>
        </ha-card>
      `;
    }

    const lang = this.hass.selectedLanguage || this.hass.language;

    const next_rising = new Date(
      this.hass.states["sun.sun"].attributes.next_rising
    );
    const next_setting = new Date(
      this.hass.states["sun.sun"].attributes.next_setting
    );

    return html`
      ${this.renderStyle()}
      <ha-card>
        ${
          stateObj.attributes.hourly_temperature &&
          stateObj.attributes.hourly_temperature.length > 0
            ? html`
                <div class="forecast clear">
                  ${
                    stateObj.attributes.hourly_temperature.slice(0, 48).map(
                      
                      (daily,i) => html`
                        <div class="day d${
                          new Date(stateObj.attributes.hourly_temperature[i].datetime).toLocaleTimeString(
                            'en-US',{hour: "numeric",hour12: false})}">
                            <span class="dayname">${
                                new Date(stateObj.attributes.hourly_temperature[i].datetime).toLocaleDateString(
                                    lang,
                                    {
                                    weekday: "short"
                                    }
                                )
                                }</span>
                            <span class="dayname">${
                                new Date(stateObj.attributes.hourly_temperature[i].datetime).toLocaleDateString(
                                    lang,
                                    {
                                    month: "2-digit",
                                    day: "2-digit"
                                    }
                                )
                                }</span>
                            <span class="dayname">${
                                new Date(stateObj.attributes.hourly_temperature[i].datetime).toLocaleTimeString(
                                    lang,
                                    {
                                    hour: "2-digit",
                                    hour12: false
                                    }
                                )
                                }</span>
                            <i class="icon" style="background: none, url(/hacsfiles/lovelace-colorfulclouds-weather-card/icons/animated/${stateObj.attributes.hourly_skycon[i].value
                                }.svg) no-repeat; background-size: contain;"></i>
                            <br />
                            <span style="border-bottom-color: hsla(0, 100%, ${((35-stateObj.attributes.hourly_temperature[i].value)*(50/45))+50}%, 1);" class="dtemp">${stateObj.attributes.hourly_temperature[i].value}${this.getUnit("temperature")}</span>
                            <span style="border-bottom-color: hsla(220, 100%, ${stateObj.attributes.hourly_cloudrate[i].value*50+50}%, 1);" class="cloudrate">${stateObj.attributes.hourly_cloudrate[i].value}</span>
                            <span style="border-bottom-color: hsla(195, 100%, ${((4.8-stateObj.attributes.hourly_precipitation[i].value)*(50/4.8))+50}%, 1);" class="precipitation">${stateObj.attributes.hourly_precipitation[i].value}${this.getUnit("precipitation")}</span>
                        </div>
                      `
                    )
                  }
                </div>
              `
            : ""
        }
      </ha-card>
    `;
  }

  getUnit(measure) {
    const lengthUnit = this.hass.config.unit_system.length;
    switch (measure) {
      case "air_pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      default:
        return this.hass.config.unit_system[measure] || "";
    }
  }

  _handleClick() {
    fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }
  _handleMousemove(e){
      if(this.grab && this.offset<1 && this.offset>-3046){
        let offset = (e.screenX || e.changedTouches[0].screenX) - this.grabX;
        this.offset = offset+this.x; 
        this.offset = this.offset>0?0:this.offset;
        this.offset = this.offset<-3045?-3045:this.offset;
        console.log('move:'+this.offset);
      }
  }
  _handleMousedown(e){
    e.preventDefault();
    e.stopPropagation();
    console.log('down:'+this.offset);e
    this.grab = true;
    this.grabX = e.screenX || e.changedTouches[0].screenX;
  }
  _handleMouseup(e){
    console.log('up:'+this.offset);
    this.grab = false;
    this.x = this.offset;
  }
  getCardSize() {
    return 3;
  }

  renderStyle() {
    return html`
      <style>
        ha-card {
          margin: auto;
          position: relative;
        }

        .clear {
          clear: both;
        }

        .ha-icon {
          height: 18px;
          margin-right: 5px;
          color: var(--paper-item-icon-color);
        }

        .title {
          position: absolute;
          left: 3em;
          top: 0.6em;
          font-weight: 300;
          font-size: 3em;
          color: var(--primary-text-color);
        }


        .unit {
          font-size: 0.8em;
        }

        .forecast {
          width: 100%;
          margin: 0 auto;
          height: 21em;
          display: flex;
          overflow-x: scroll;

        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
            border-radius: 3px;
            background: rgba(0,0,0,0.06);
            -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.08);
        }
        /* 滚动条滑块 */
        ::-webkit-scrollbar-thumb {
            border-radius: 3px;
            background: rgba(0,0,0,0.12);
            -webkit-box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
        }


        .day {
          padding-top: 2.5em;
          padding-bottom: 1.3em;
          display: block;
          width: 16%;
          float: left;
          text-align: center;
          color: var(--primary-text-color);
          line-height: 2;
          box-sizing: border-box;
          flex:none;
        }

        .d18,.d19,.d20,.d21,.d22,.d23,.d24,.d00,.d01,.d02,.d03,.d04,.d05,.d06{
          background: #0000000b;
        }

        .dayname {
          text-transform: uppercase;
          display: block;
        }

        .forecast .day:first-child {
          margin-left: 0;
        }

        .forecast .day:nth-last-child(1) {
          border-right: none;
          margin-right: 0;
        }

        .dtemp{
          font-weight: bold;
          display: block;
          border-bottom: solid 3px #fff;
        }

        .precipitation,.cloudrate {
          color: var(--secondary-text-color);
          display: block;
          border-bottom: solid 3px;
        }

        .icon.bigger {
          width: 10em;
          height: 10em;
          margin-top: -4em;
          position: absolute;
          left: 0em;
        }

        .icon {
          width: 50px;
          height: 50px;
          margin-right: 5px;
          display: inline-block;
          vertical-align: middle;
          background-size: contain;
          background-position: center center;
          background-repeat: no-repeat;
          text-indent: -9999px;
        }

        .weather {
          font-weight: 300;
          font-size: 1.5em;
          color: var(--primary-text-color);
          text-align: left;
          position: absolute;
          top: -0.5em;
          left: 6em;
          word-wrap: break-word;
          width: 30%;
        }
      </style>
    `;
  }
}
customElements.define("weather-more-info", WeatherMoreInfo);
