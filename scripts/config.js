Hooks.on("renderSceneConfig", (app, html, data) => {
  const invertMask = app.object.getFlag(WeatherBlocker.moduleName, "invertMask") || false;

  const wbhtml = `
      <div class="form-group">
          <label>${game.i18n.localize(
            "weatherblock.sceneconfig.invertMask.name"
          )}</label>
          <input id="invertMask" type="checkbox" name="flags.weatherblock.invertMask" data-dtype="Boolean" ${
            invertMask ? "checked" : ""
          }>
          <p class="notes">${game.i18n.localize(
            "weatherblock.sceneconfig.invertMask.hint"
          )}</p>
      </div>
      `;

  html.find("select[name ='weather']").closest(".form-group").after(wbhtml);
});

Hooks.on("renderDrawingConfig", (app, html, data) => {
  const isWeatherBlocking = app.object.getFlag(WeatherBlocker.moduleName, "blockWeather") || false;

  const wbhtml = `
  <div class="form-group">
    <label>${game.i18n.localize("weatherblock.drawingconfig.blockWeather.name")}</label>
    <div class="form-fields">
        <input type="checkbox" ${isWeatherBlocking ? "checked" : ""} name="flags.${WeatherBlocker.moduleName}.blockWeather">
    </div>
  </div>
  `

  html.find("input[name='z']").closest(".form-group").after(wbhtml);
})
