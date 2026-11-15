import { allContent } from '../server/db.js';
import { json, method, route } from '../server/http.js';

export default route(async (req, res) => {
  method(req, ['GET']);
  const content = await allContent();
  const result = Object.fromEntries(Object.entries(content).map(([section, entry]) =>
    [section, Array.isArray(entry.data) ? entry.data.filter(item => item.enabled) : entry.data]
  ));
  const services = new Set(result.services.map(item => item.id));
  result.plans = result.plans.filter(plan => services.has(plan.service));
  json(res, 200, result);
});
