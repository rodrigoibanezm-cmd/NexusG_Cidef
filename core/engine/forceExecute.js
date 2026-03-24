// /core/engine/forceExecute.js

export function extractExecuteInput(maps) {
  const topic = Object.keys(maps)[0];

  let models = [];

  const mapData = maps[topic];

  if (Array.isArray(mapData)) {
    models = mapData
      .map((item) => item?.modelo || item?.model || item?.name)
      .filter(Boolean);
  } else if (mapData?.modelos) {
    models = mapData.modelos;
  }

  return { topic, models };
}
