// Lead auto-assignment: showroom + model first, then widen. Ties go to the least-loaded consultant.

/**
 * @param {Array<{id:number, showroom_id:number, models:number[], open_leads:number}>} consultants
 * @param {{showroomId?:number|null, modelId?:number|null}} lead
 * @returns {{userId:number|null, rule:string}}  userId null => lead desk (admin queue)
 */
export function pickConsultant(consultants, { showroomId = null, modelId = null }) {
  const tiers = [
    ['showroom+model', (c) => showroomId != null && modelId != null && c.showroom_id === showroomId && c.models.includes(modelId)],
    ['showroom', (c) => showroomId != null && c.showroom_id === showroomId],
    ['model', (c) => modelId != null && c.models.includes(modelId)],
  ];
  for (const [rule, test] of tiers) {
    const pool = consultants.filter(test);
    if (pool.length) {
      pool.sort((a, b) => a.open_leads - b.open_leads || a.id - b.id);
      return { userId: pool[0].id, rule };
    }
  }
  return { userId: null, rule: 'lead-desk' };
}
