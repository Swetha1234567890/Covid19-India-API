const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
let db = null;

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDB();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachArray) =>
      convertStateDbObjectToResponseObject(eachArray)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateIdQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const state = await db.get(getStateIdQuery);
  response.send(state);
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await db.get(getDistrictIdQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    stateId,
    districtName,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `INSERT INTO district (state_id, district_name, 
        cases, cured, active, deaths)
        VALUES
        (
            ${stateId},'${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`;
  const dbResponse = await db.run(addDistrictQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `UPDATE district SET district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths} WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `SELECT SUM(cases), SUM(cured), SUM(active), SUM(deaths) FROM district 
    WHERE state_id = ${stateId};`;
  const stats = await db.get(getStatsQuery);
  console.log(stats);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDetails = `SELECT state_name FROM district NATURAL JOIN state 
    WHERE district.state_id = state.state_id;`;
  const details = await db.get(getDetails);
  response.send({ stateName: details.state_name });
});

module.exports = app;
