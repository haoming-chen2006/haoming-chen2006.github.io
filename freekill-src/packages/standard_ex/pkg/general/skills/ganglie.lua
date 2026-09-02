Fk:loadTranslationTable{
  ["ex__ganglie"] = "刚烈",
  [":ex__ganglie"] = "当你受到1点伤害后，你可以判定，若结果为：红色，你对来源造成1点伤害；黑色，你弃置来源的一张牌。",

  ["#ex__ganglie-invoke"] = "刚烈：是否对 %dest 发动“刚烈”进行判定，红色对其造成伤害，黑色弃置其牌",

  ["$ex__ganglie1"] = "哪个敢动我！",
  ["$ex__ganglie2"] = "伤我者，十倍奉还！",
}

local ganglie = fk.CreateSkill{
  name = "ex__ganglie",
}

ganglie:addEffect(fk.Damaged, {
  anim_type = "masochism",
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if data.from and not data.from.dead then
      if room:askToSkillInvoke(player, {
        skill_name = ganglie.name,
        prompt = "#ex__ganglie-invoke::"..data.from.id,
      }) then
        event:setCostData(self, {tos = {data.from}})
        return true
      end
    else
      return room:askToSkillInvoke(player, {
        skill_name = ganglie.name,
      })
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = player,
      reason = ganglie.name,
      pattern = ".|.|^nosuit",
    }
    room:judge(judge)
    if not data.from or data.from.dead then return false end
    if judge.card.color == Card.Red then
      room:damage{
        from = player,
        to = data.from,
        damage = 1,
        skillName = ganglie.name,
      }
    elseif judge.card.color == Card.Black and not data.from:isNude() and not player.dead then
      local cid = room:askToChooseCard(player, {
        target = data.from,
        flag = "he",
        skill_name = ganglie.name
      })
      room:throwCard(cid, ganglie.name, data.from, player)
    end
  end
})

return ganglie
