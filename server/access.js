import {timingSafeEqual} from 'node:crypto';
/** @param {{key?:string,allowedOrigins?:string[],production?:boolean}} options */
export function studioAccess({key='',allowedOrigins=[],production=false}){
 return (req,res,next)=>{
  const origin=req.get('Origin');
  const ownOrigin=`${req.get('x-forwarded-proto')||req.protocol}://${req.get('host')}`;
  if(origin&&origin!==ownOrigin&&!allowedOrigins.includes(origin))return res.status(403).json({success:false,error:'This site is not allowed to use the publishing service.'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, Idempotency-Key');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS')return res.sendStatus(204);
  if(req.path==='/api/health')return res.json({status:'ok',requiresKey:!!key,configured:!production||!!key});
  if(!req.path.startsWith('/api/'))return next();
  if(production&&!key)return res.status(503).json({success:false,error:'The publishing service needs STUDIO_ACCESS_KEY configured by its owner.'});
  if(key){const supplied=(req.get('Authorization')||'').replace(/^Bearer /,'');const actual=Buffer.from(key),received=Buffer.from(supplied);if(actual.length!==received.length||!timingSafeEqual(actual,received))return res.status(401).json({success:false,error:'Enter the publishing service access key in Settings.'});}
  next();
 };
}
