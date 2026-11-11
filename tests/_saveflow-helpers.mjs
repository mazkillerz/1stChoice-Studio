/* Shared by the suites that save to the team (2.3.0): the Save sheet starts on My phone, so they choose Phone + Team and name a collection first. */
export async function chooseTeam(pg,col='Suite'){
  await pg.evaluate(()=>document.querySelector('#saveWhere [data-where="team"]').click());
  await pg.waitForSelector('#teamCols [data-newcol]',{timeout:15000}); await pg.waitForTimeout(250);
  if(col){ if(await pg.isHidden('#teamNewRow')) await pg.evaluate(()=>document.querySelector('#teamCols [data-newcol]').click()); await pg.fill('#teamNewCol',col); } }
export const chooseMe=pg=>pg.evaluate(()=>document.querySelector('#saveWhere [data-where="me"]').click());
