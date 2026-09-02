local jixiang = fk.CreateSkill {
  name = "jixiang",
  attached_skill_name = "jixiang&",
}

Fk:loadTranslationTable{
  ["jixiang"] = "济乡",
  [":jixiang"] = "当其他角色于你的回合内需要使用或打出基本牌时（每回合每种牌名各限一次），你可以弃置一张牌令其视为使用或打出之，"..
  "然后你摸一张牌并令〖称贤〗于此阶段可发动次数+1。",

  ["$jixiang1"] = "珠玉不足贵，德行传家久。",
  ["$jixiang2"] = "人情一日不食则饥，愿母亲慎思之。",
}

jixiang:addEffect("visibility", {})

return jixiang
