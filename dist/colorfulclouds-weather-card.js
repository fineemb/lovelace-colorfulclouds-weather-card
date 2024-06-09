console.info(
  "%c  WEATHER CARD  \n%c  Version 2.0.0 ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);
const deps = [
  "paper-input",
  "paper-dropdown-menu",
  "paper-item",
  "paper-listbox",
];
deps.map((dep) => {
  if (!customElements.get(dep)) {
    console.log("imported", dep);
    import(`https://unpkg.com/@polymer/${dep}/${dep}.js?module`);
  }
});
const preloadCard = (type) =>
  window
    .loadCardHelpers()
    .then(({ createCardElement }) => createCardElement({ type }));
const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);

const html = LitElement.prototype.html;
const css = LitElement.prototype.css;
const includeDomains = ["weather"];
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
  "N",
];
const skycon2cn = {
  CLEAR_DAY: "晴",
  CLEAR_NIGHT: "晴",
  PARTLY_CLOUDY_DAY: "多云",
  PARTLY_CLOUDY_NIGHT: "多云",
  CLOUDY: "阴",
  LIGHT_HAZE: "轻度雾霾",
  MODERATE_HAZE: "中度雾霾",
  HEAVY_HAZE: "重度雾霾",
  LIGHT_RAIN: "小雨",
  MODERATE_RAIN: "中雨",
  HEAVY_RAIN: "大雨",
  STORM_RAIN: "暴雨",
  FOG: "雾",
  LIGHT_SNOW: "小雪",
  MODERATE_SNOW: "中雪",
  HEAVY_SNOW: "大雪",
  STORM_SNOW: "暴雪",
  DUST: "浮尘",
  SAND: "沙尘",
  WIND: "大风",
};

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
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
      _hass: {},
      showTarget: 0,
      hourly: [],
      daily: [],
    };
  }

  static getConfigElement() {
    return document.createElement("colorfulclouds-weather-card-editor");
  }
  static getStubConfig() {
    return {
      entity: null,
      show_houer: true,
      show_daily: true,
      show_realtime: true,
      icon: "/hacsfiles/lovelace-colorfulclouds-weather-card/icons/animated/",
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a weather entity");
    }
    this._config = config;
    this.showTarget = 0;
    this._last_updated = null;
    this.tempMAX = null;
    this.tempMIN = null;
    this.tempCOLOR = [];
  }
  set hass(hass) {
    if (this._config.entity === "none") return;
    this._hass = hass;
    const stateObj = this._hass.states[this._config.entity];
    const last_updated = new Date(stateObj.last_updated).getTime();
    this._attributes = stateObj.attributes;
    if (last_updated !== this._last_updated) {
      if (this._config.show_daily) {
        this._hass
          .callWS({
            type: "call_service",
            domain: "weather",
            service: "get_forecasts",
            service_data: { type: "daily" },
            target: { entity_id: [this._config.entity] },
            return_response: true,
          })
          .then((response) => {
            this.daily = response.response[this._config.entity].forecast;
          });
      }
      if (this._config.show_houer) {
        this._hass
          .callWS({
            type: "call_service",
            domain: "weather",
            service: "get_forecasts",
            service_data: { type: "hourly" },
            target: { entity_id: [this._config.entity] },
            return_response: true,
          })
          .then((response) => {
            console.log(response);
            const hourly = response.response[this._config.entity].forecast;
            this.hourly = hourly;
            this.tempMAX = hourly[0].temperature;
            this.tempMIN = hourly[0].temperature;

            hourly.forEach((item, index) => {
              this.tempMAX =
                this.tempMAX > item.temperature
                  ? this.tempMAX
                  : item.temperature;
            });
            hourly.forEach((item, index) => {
              this.tempMIN =
                this.tempMIN < item.temperature
                  ? this.tempMIN
                  : item.temperature;
            });

            hourly.map((item, i) =>
              this.tempCOLOR.push(
                Math.round(
                  255 *
                    ((item.temperature - this.tempMIN) /
                      (this.tempMAX - this.tempMIN))
                ) +
                  "," +
                  Math.round(
                    66 +
                      150 *
                        (1 -
                          (item.temperature - this.tempMIN) /
                            (this.tempMAX - this.tempMIN))
                  ) +
                  "," +
                  Math.round(
                    255 *
                      (1 -
                        (item.temperature - this.tempMIN) /
                          (this.tempMAX - this.tempMIN))
                  )
              )
            );
            this._last_updated = last_updated;
          });
      }
    }
  }

  shouldUpdate(changedProps) {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  render() {
    if (!this._config || !this._hass) {
      return html``;
    }

    if (this._config.entity === "none") {
      if (
        this.hass.config.components.indexOf("tianqi") == -1 ||
        this.hass.config.components.indexOf("colorfulclouds") == -1
      ) {
        return html`
          <style>
            .not-found {
              flex: 1;
              background-color: yellow;
              padding: 15px;
            }
          </style>
          <ha-card>
            <div class="not-found">
              未安装天气预报集成: <br />
              此卡片需要依赖天气预报集成，
              <a href="https://github.com/fineemb/Colorfulclouds-weather"
                >彩云天气</a
              >，
              <a href="https://github.com/hasscc/tianqi">中国天气</a>
              点击前往
            </div>
          </ha-card>
        `;
      }

      var RE1 = new RegExp("weather.");
      Object.keys(this.hass.states)
        .filter((a) => RE1.test(a))
        .map((entId) => {
          this._config.entity = entId;
        });
      this._config.show_houer = false;
      this._config.show_daily = false;
    }

    let stateObj = this._hass.states[this._config.entity];
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
    const showdata = this.showTarget;
    const attributes = stateObj.attributes;

    const iconUrl =
      this._config.icon ||
      "/hacsfiles/lovelace-colorfulclouds-weather-card/icons/animated/";
    const lang = this._hass.selectedLanguage || this._hass.language;
    const next_rising = new Date(
      this._hass.states["sun.sun"].attributes.next_rising
    );
    const next_setting = new Date(
      this._hass.states["sun.sun"].attributes.next_setting
    );

    return html`
      ${this.renderStyle()}
      <ha-card>
        <div class="content">
          <div class="icon-image">
            <span
              style="background: none, url(${iconUrl}${attributes.skycon}.svg) no-repeat; background-size: contain;"
            >
            </span>
          </div>
          <div class="info">
            <div class="name-state">
              <div class="state">${skycon2cn[attributes.skycon]}</div>
              <div class="name">
                ${this._config.name
                  ? this._config.name
                  : attributes.friendly_name}
              </div>
            </div>
            <div class="temp-attribute">
              <div class="temp">
                ${attributes.temperature}
                <span>${this.getUnit("temperature")}</span>
              </div>
              <div class="attribute">
                ${this._hass.localize(
                  `ui.card.weather.attributes.${this._config.secondary_info_attribute}`
                )}
                ${attributes[this._config.secondary_info_attribute]}
                ${this.getUnit(this._config.secondary_info_attribute)}
              </div>
            </div>
          </div>
        </div>
        ${this._config.show_realtime
          ? html`
              <div>
                <div>
                  <ul style="list-style:none;padding:0 0 0 14px;margin: 0;">
                    <li style="font-weight:bold;">
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:camera-timer"></ha-icon
                      ></span>
                      ${attributes.forecast_minutely}
                    </li>
                    <li>
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:clock-outline"></ha-icon></span
                      >${attributes.forecast_hourly}
                    </li>
                  </ul>
                </div>
                <span>
                  <ul class="variations">
                    <li>
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:water-percent"></ha-icon
                      ></span>
                      ${attributes.humidity}<span class="unit"> % </span>
                      <br />
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:weather-windy"></ha-icon
                      ></span>
                      ${windDirections[
                        parseInt((attributes.wind_bearing + 11.25) / 22.5)
                      ]}
                      ${attributes.wind_speed}<span class="unit">
                        ${this.getUnit("length")}/h
                      </span>
                      <br />
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:weather-sunset-up"></ha-icon
                      ></span>
                      ${next_rising.toLocaleTimeString()}
                    </li>
                    <li>
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:gauge"></ha-icon></span
                      >${Math.round(attributes.pressure) / 100}<span
                        class="unit"
                      >
                        ${this.getUnit("air_pressure")}
                      </span>
                      <br />
                      <span class="ha-icon"
                        ><ha-icon icon="mdi:weather-fog"></ha-icon
                      ></span>
                      ${attributes.visibility}<span class="unit">
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
              </div>
            `
          : ""}
        ${this.daily && this.daily.length > 0 && this._config.show_daily
          ? html`
              <div class="forecast clear" @scroll="${this._dscroll}">
                ${this.daily.map(
                  (daily) => html`
                    <div class="day">
                      <span class="dayname"
                        >${this._today(daily.datetime)} </span
                      ><br />
                      <span class="dayname"
                        >${new Date(daily.datetime).toLocaleDateString(lang, {
                          month: "2-digit",
                          day: "2-digit",
                        })}</span
                      >
                      <br /><i
                        class="icon"
                        style="background: none, url(${iconUrl}${daily.skycon}.svg) no-repeat; background-size: contain;"
                      ></i>
                      <br /><span class="highTemp"
                        >${daily.temperature}${this.getUnit(
                          "temperature"
                        )}</span
                      >
                      ${typeof daily.templow !== "undefined"
                        ? html`
                            <br /><span class="lowTemp"
                              >${daily.templow}${this.getUnit(
                                "temperature"
                              )}</span
                            >
                            <br /><span class="lowTemp"
                              >${Math.round(daily.precipitation * 100) /
                              100}${this.getUnit("precipitation")}</span
                            >
                          `
                        : ""}
                    </div>
                  `
                )}
              </div>
            `
          : ""}
        ${this.hourly && this.hourly.length > 0 && this._config.show_houer
          ? html`
              <div class="forecast clear" @scroll="${this._hscroll}">
                ${this.hourly.map(
                  (hourly, i) => html`
                    <div
                      class="hourly${i > this.hourly.length - 5
                        ? " last5"
                        : ""} d${new Date(hourly.datetime).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          hour12: false,
                        }
                      )}"
                    >
                      <span
                        class="dayname ${new Date(hourly.datetime).getHours() ==
                        12
                          ? "show"
                          : ""}"
                        >${new Date(hourly.datetime).toLocaleTimeString(lang, {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "numeric",
                          hour12: false,
                        })}</span
                      >
                      <i
                        class="icon"
                        style="background: none${i > 0 &&
                        hourly.skycon == this.hourly[i - 1].skycon
                          ? ""
                          : ", url(" +
                            iconUrl +
                            hourly.skycon +
                            ".svg) no-repeat"}; background-size: contain;"
                      ></i>
                      <br />
                      <span class="dayname">.</span>
                      <span
                        style="border-top-color: rgb(${this.tempCOLOR[
                          i
                        ]});border-top-width:${((hourly.temperature -
                          this.tempMIN) /
                          (this.tempMAX - this.tempMIN)) *
                          7 +
                        3}px"
                        class="dtemp"
                        >.</span
                      >
                      <span
                        style="border-top-color: hsla(220, 100%, ${hourly.cloud_coverage *
                          50 +
                        50}%, 1);"
                        class="cloudrate"
                        >.</span
                      >
                      <span
                        style="border-top-color: hsla(195, 100%, ${(4.8 -
                          hourly.precipitation) *
                          (50 / 4.8) +
                        50}%, 1);"
                        class="precipitation"
                        >.</span
                      >
                    </div>
                  `
                )}
                <div class="show hourly showdata">
                  <span class="dayname"
                    >${new Date(
                      this.hourly[showdata].datetime
                    ).toLocaleTimeString(lang, {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "numeric",
                      hour12: false,
                    })}</span
                  >
                  <span class="icon"></span>
                  <span class="dayname"
                    >${skycon2cn[this.hourly[showdata].skycon]}</span
                  >
                  <span class="dtemp"
                    >${this.hourly[showdata].temperature}${this.getUnit(
                      "temperature"
                    )}</span
                  >
                  <span class="cloudrate"
                    >${this.hourly[showdata].cloudrate}</span
                  >
                  <span class="precipitation"
                    >${Math.round(this.hourly[showdata].precipitation * 100) /
                    100}${this.getUnit("precipitation")}</span
                  >
                </div>
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  _dscroll(e) {
    // console.log("L:"+e.target.scrollLeft+",W:"+e.target.scrollWidth)
    let Dforecast = e.target;
    let Hforecast = e.target.nextElementSibling;
    let scale =
      (Hforecast.scrollWidth - Hforecast.offsetWidth) /
      (Dforecast.scrollWidth - Dforecast.offsetWidth);
    Hforecast.scrollLeft = Dforecast.scrollLeft * scale;
  }
  _hscroll(e) {
    // console.log("L:"+e.target.scrollLeft+",W:"+e.target.scrollWidth)
    let Hforecast = e.target;
    let Hs = Hforecast.children.length - 1;
    let scrollWidth = Hs * 25;
    let i = Math.floor(
      Hforecast.scrollLeft / ((scrollWidth - Hforecast.clientWidth) / Hs)
    );
    let offset_data =
      (Hforecast.scrollLeft * scrollWidth) /
      (scrollWidth - Hforecast.clientWidth);
    offset_data =
      offset_data > scrollWidth - 25 ? scrollWidth - 25 : offset_data;

    if (this.showTarget > Hs / 2) {
      offset_data = offset_data - 85;
      Hforecast.lastElementChild.classList.add("right");
    } else {
      Hforecast.lastElementChild.classList.remove("right");
    }

    Hforecast.lastElementChild.style.left = offset_data + "px";

    if (i === this.showTarget) return;
    i = i === Hs ? Hs - 1 : i;
    this.showTarget = i;
    // console.log("L:"+this.showTarget);
  }
  getUnit(measure) {
    const lengthUnit = this._hass.config.unit_system.length || "";
    switch (measure) {
      case "pressure":
        return lengthUnit === "km" ? "hPa" : "inHg";
      case "wind_speed":
        return `${lengthUnit}/h`;
      case "length":
        return lengthUnit;
      case "precipitation":
        return lengthUnit === "km" ? "mm" : "in";
      case "visibility":
        return lengthUnit;
      case "humidity":
      case "precipitation_probability":
        return "%";
      default:
        return this._hass.config.unit_system[measure] || "";
    }
  }
  _today(date) {
    const lang = this._hass.selectedLanguage || this._hass.language;
    let retext = new Date(date).toLocaleDateString(lang, {
      weekday: "short",
    });
    let inDate = new Date(date);
    let nowDate = new Date();

    if (inDate.getDate() === nowDate.getDate()) {
      retext = this._hass.localize(
        "ui.components.date-range-picker.ranges.today"
      );
    }
    return retext;
  }
  _handleClick() {
    fireEvent(this, "hass-more-info", { entityId: this._config.entity });
  }

  updated(changedProps) {
    if (!this._config || !this._config.theme) {
      return;
    }

    const oldHass = changedProps.get("hass");
    if (!oldHass || oldHass.themes !== this._hass.themes) {
      this.applyThemesOnElement(this, this._hass.themes, this._config.theme);
    }
  }

  applyThemesOnElement(element, themes, localTheme) {
    if (!element._themes) {
      element._themes = {};
    }
    let themeName = themes.default_theme;
    if (localTheme === "default" || (localTheme && themes.themes[localTheme])) {
      themeName = localTheme;
    }
    const styles = Object.assign({}, element._themes);
    if (themeName !== "default") {
      var theme = themes.themes[themeName];
      Object.keys(theme).forEach((key) => {
        var prefixedKey = "--" + key;
        element._themes[prefixedKey] = "";
        styles[prefixedKey] = theme[key];
      });
    }
    if (element.updateStyles) {
      element.updateStyles(styles);
    } else if (window.ShadyCSS) {
      // implement updateStyles() method of Polemer elements
      window.ShadyCSS.styleSubtree(
        /** @type {!HTMLElement} */ (element),
        styles
      );
    }

    const meta = document.querySelector("meta[name=theme-color]");
    if (meta) {
      if (!meta.hasAttribute("default-content")) {
        meta.setAttribute("default-content", meta.getAttribute("content"));
      }
      const themeColor =
        styles["--primary-color"] || meta.getAttribute("default-content");
      meta.setAttribute("content", themeColor);
    }
  }
  renderStyle() {
    return html`
      <style>
        .forecast {
          width: 100%;
          margin: 0 auto;
          display: flex;
          overflow-x: auto;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.06);
          -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.08);
        }
        /* 滚动条滑块 */
        ::-webkit-scrollbar-thumb {
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.12);
          -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
        }
        ha-card {
          margin: auto;
          padding: 1em;
          position: relative;
        }

        /* content */
        .content {
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          align-items: center;
        }
        .icon-image {
          display: flex;
          align-items: center;
          min-width: 96px;
        }
        .icon-image > * {
          flex: 0 0 74px;
          height: 74px;
        }
        .weather-icon {
          --mdc-icon-size: 64px;
        }
        .info {
          display: flex;
          justify-content: space-between;
          flex-grow: 1;
          overflow: hidden;
        }
        .temp-attribute {
          text-align: right;
          margin-right: 5px;
        }
        .temp-attribute .temp {
          position: relative;
          margin-right: 24px;
        }
        .temp-attribute .temp span {
          position: absolute;
          font-size: 24px;
          top: 1px;
        }
        .state,
        .temp-attribute .temp {
          font-size: 28px;
          line-height: 1.2;
        }
        .name,
        .attribute {
          font-size: 14px;
          line-height: 1;
          color: var(--secondary-text-color);
        }
        .name-state {
          overflow: hidden;
          padding-right: 12px;
          width: 100%;
        }
        .name,
        .state {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .attribute {
          white-space: nowrap;
        }

        .ha-icon {
          height: 18px;
          margin-right: 5px;
          color: var(--paper-item-icon-color);
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
          margin-top: 1em;
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
        .day {
          display: block;
          width: 20%;
          flex: none;
          text-align: center;
          color: var(--primary-text-color);
          border-right: 0.1em solid #d9d9d9;
          line-height: 2;
          box-sizing: border-box;
          padding-bottom: 1em;
        }
        .hourly {
          display: block;
          width: 25px;
          line-height: 2;
          flex: none;
          text-align: center;
          color: var(--primary-text-color);
          padding-bottom: 1em;
          overflow: visible;
          word-break: keep-all;
        }
        .dayname {
          text-transform: uppercase;
          white-space: nowrap;
          word-break: keep-all;
        }
        .forecast {
          position: relative;
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
        .icon {
          width: 42px;
          height: 42px;
          display: inline-block;
          vertical-align: middle;
          background-size: contain;
          background-position: center center;
          background-repeat: no-repeat;
          text-indent: -9999px;
        }
        .hourly .icon {
          width: 25px;
          height: 25px;
        }
        .hourly .dayname,
        .hourly .cloudrate,
        .hourly .precipitation {
          color: #00000000;
        }
        .hourly.show {
          border-left: 0.1em solid #d9d9d9;
          box-sizing: border-box;
        }
        .hourly.show .dayname,
        .hourly.show .dtemp,
        .hourly.show .precipitation,
        .hourly.show .cloudrate {
          color: var(--primary-text-color);
        }
        .dayname.show {
          color: var(--primary-text-color);
          margin: 0 6px;
        }
        .hourly.last5 {
          overflow: hidden;
        }
        .hourly.last5 > .dayname {
          color: #00000000;
        }
        .dtemp {
          font-weight: bold;
          display: block;
          border-top: solid 3px #fff;
          box-sizing: border-box;
          overflow: visible;
          color: #00000000;
          height: 35px;
          line-height: 35px;
        }

        .precipitation,
        .cloudrate {
          color: var(--secondary-text-color);
          display: block;
          border-top: solid 6px;
          overflow: visible;
          color: #00000000;
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
        .showdata {
          position: absolute;
          width: 85px;
          left: 0;
        }
        .showdata > * {
          border-top-color: #00000000;
          position: relative;
          display: block;
          text-align: left;
          margin: 0 5px;
        }
        .showdata > .dayname {
          background: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
        }
        .showdata.right {
          border-left: none;
          border-right: 0.1em solid #d9d9d9;
        }
        .showdata.right > * {
          text-align: right;
        }
      </style>
    `;
  }
}
customElements.define("weather-card", WeatherCard);

export class WeatherEditor extends LitElement {
  setConfig(config) {
    // preloadCard({ type: "weather-forecast", config: config });
    // customElements.get("hui-entity-button-card");
    this.config = config;
  }

  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }
  render() {
    var RE1 = new RegExp("weather.");
    this._entity = this.config.entity;
    let attributes = this.hass.states[this._entity]?.attributes;
    return html`
      <div class="card-config">
        <!-- <ha-entity-picker
          .label="${this.hass.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        )} (${this.hass.localize(
          "ui.panel.lovelace.editor.card.config.required"
        )})"
          .hass=${this.hass}
          .value=${this.config.entity}
          .configValue=${"entity"}
          .includeDomains=${includeDomains}
          @change=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker> -->
        <paper-input-container>
          <input
            type="text"
            value="${this.config.entity}"
            slot="input"
            list="browsers"
            .configValue="${"entity"}"
            autocapitalize="none"
            @change="${this._valueChanged}"
          />
          <datalist id="browsers">
            ${Object.keys(this.hass.states)
              .filter((a) => RE1.test(a))
              .map(
                (entId) => html`
                  <option value=${entId}>
                    ${this.hass.states[entId].attributes.friendly_name || entId}
                  </option>
                `
              )}
          </datalist>
        </paper-input-container>

        <paper-input
          label="天气图标路径"
          .value="${this.config.icon}"
          .configValue="${"icon"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>

        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.name"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this.config.name}
            .configValue=${"name"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this.config.theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>

        <div class="side-by-side">
          <paper-input-container>
            <label slot="label">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.card.generic.secondary_info_attribute"
              )}
              (${this.hass.localize(
                "ui.panel.lovelace.editor.card.config.optional"
              )})
            </label>
            <input
              type="text"
              value="${this.config.secondary_info_attribute}"
              slot="input"
              list="attributelist"
              autocapitalize="none"
              .configValue="${"secondary_info_attribute"}"
              @change=${this._valueChanged}
              @focus=${this._focusEntity}
            />
          </paper-input-container>
          <ha-formfield label="实时天气">
            <ha-switch
              id="df"
              ?checked=${this.config.show_realtime}
              value="normal"
              name="style_mode"
              .configValue="${"show_realtime"}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
          <ha-formfield label="按天预报">
            <ha-switch
              id="df"
              ?checked=${this.config.show_daily}
              value="normal"
              name="style_mode"
              .configValue="${"show_daily"}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
          <ha-formfield label="小时预报">
            <ha-switch
              id="hf"
              ?checked=${this.config.show_houer}
              value="normal"
              name="style_mode"
              .configValue="${"show_houer"}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>
        <datalist id="entitieslist">
          ${Object.keys(this.hass.states)
            .filter((a) => RE1.test(a))
            .map(
              (entId) => html`
                <option value=${entId}>
                  ${this.hass.states[entId].attributes.friendly_name || entId}
                </option>
              `
            )}
        </datalist>
        ${this.hass.states[this._entity]
          ? html`
              <datalist id="attributelist">
                ${Object.keys(attributes).map(
                  (item) => html`
                    <option value=${item}>
                      ${this.hass.localize(
                        `ui.card.weather.attributes.${item}`
                      )}
                    </option>
                  `
                )}
              </datalist>
            `
          : ``}
      </div>
    `;
  }
  static get styles() {
    return css`
      a {
        color: var(--accent-color);
      }
      .side-by-side {
        display: flex;
        align-items: flex-end;
        flex-wrap: wrap;
      }
      .side-by-side > * {
        flex: 1;
        padding-right: 4px;
      }
    `;
  }
  _focusEntity(e) {
    e.target.value = "";
  }

  _valueChanged(e) {
    const target = e.target;

    if (!this.config || !this.hass || !target) {
      return;
    }
    let configValue = target.configValue;
    let newConfig = {
      ...this.config,
    };
    (newConfig[configValue] =
      configValue === "entity" ||
      configValue === "icon" ||
      configValue === "name" ||
      configValue === "theme" ||
      configValue === "secondary_info_attribute"
        ? target.value
        : target.checked),
      this.configChanged(newConfig);
  }

  configChanged(newConfig) {
    const event = new Event("config-changed", {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }
}

customElements.define("colorfulclouds-weather-card-editor", WeatherEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "weather-card",
  name: "Colorfulclouds Weather Lovelace Card",
  preview: true, // Optional - defaults to false
  description: "彩云天气卡片", // Optional
});
