/**
 * 超管 OpenID — 与前端删除按钮、云库写权限需保持一致
 *
 * hospital_reviews 推荐安全规则：
 * {
 *   "read": true,
 *   "create": true,
 *   "update": "doc._openid == auth.openid || auth.openid == 'oYAAb5P-QSbbTXSu7xcFLmTPSSH4'",
 *   "delete": "doc._openid == auth.openid || auth.openid == 'oYAAb5P-QSbbTXSu7xcFLmTPSSH4'"
 * }
 *
 * 注意：create 建议用 true，不要用 auth.openid != null（开发者工具下可能写入失败）
 * 发布也可走云函数 checkReviewSafe（绕过客户端 create 限制）
 */
export const ADMIN_OPENID = 'oYAAb5P-QSbbTXSu7xcFLmTPSSH4'

export const INSURANCE_TYPES = ['支付宝直赔', '微保腾讯险', '京东宠物险', '无医保自费']

export const RED_TAGS = ['效果显著', '价格透明', '态度极好', '医保直赔', '环境干净', '不乱开药']

export const BLACK_TAGS = ['乱做检查', '态度恶劣', '隐形消费', '排队极长', '虚假宣传', '技术不行']

/** 城市 → 区县列表（发布页手动选择时的补充；列表筛选项优先来自定位 + 数据库真实数据） */
export const CITY_DISTRICTS = {
  北京市: ['海淀区', '昌平区', '朝阳区', '东城区', '西城区', '丰台区', '石景山区', '通州区', '大兴区', '顺义区', '房山区', '门头沟区', '怀柔区', '平谷区', '密云区', '延庆区'],
  上海市: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '松江区', '青浦区', '奉贤区', '金山区', '崇明区'],
  广州市: ['天河区', '越秀区', '荔湾区', '海珠区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '增城区', '从化区'],
  深圳市: ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区'],
  齐齐哈尔市: ['龙沙区', '建华区', '铁锋区', '昂昂溪区', '富拉尔基区', '碾子山区', '梅里斯达斡尔族区', '讷河市', '龙江县', '依安县', '泰来县', '甘南县', '富裕县', '克山县', '克东县', '拜泉县']
}

export function getDistrictsForCity(city) {
  return CITY_DISTRICTS[city] || []
}

export function getCityList() {
  return Object.keys(CITY_DISTRICTS)
}

/** 就医指南列表每页条数 */
export const REVIEW_PAGE_SIZE = 20

/** 本地开发 / 定位失败时的默认城市 */
export const DEFAULT_CITY = '北京市'
export const DEFAULT_DISTRICT = '海淀区'

export function listTypeLabel(type) {
  return type === 'red' ? '宠友红榜' : '商家黑榜'
}

export function formatReviewTime(ts) {
  if (!ts) return ''
  const ms = typeof ts === 'number' && ts < 1e12 ? ts : Number(ts)
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
