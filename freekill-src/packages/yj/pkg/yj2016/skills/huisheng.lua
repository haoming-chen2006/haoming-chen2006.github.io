local huisheng = fk.CreateSkill {
  name = "huisheng",
}

Fk:loadTranslationTable{
  ["huisheng"] = "贿生",
  [":huisheng"] = "当你受到其他角色造成的伤害时，你可以选择至少一张牌，令其观看并选择一项：1.获得其中一张，防止此伤害，然后你不能再对其"..
  "发动此技能；2.弃置等量的牌。",

  ["#huisheng-invoke"] = "贿生：你可以选择至少一张牌令 %src 观看",
  ["#huisheng-discard"] = "贿生：弃置%arg张牌，否则你获得%arg2并防止对%dest造成的伤害",

  ["$huisheng1"] = "大人，这些钱够吗？",
  ["$huisheng2"] = "劳烦大人美言几句~",
}

huisheng:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(huisheng.name) and
      not player:isNude() and data.from and data.from ~= player and not data.from.dead and
      not table.contains(player:getTableMark(huisheng.name), data.from.id)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local cards = room:askToCards(player, {
      skill_name = huisheng.name,
      include_equip = true,
      min_num = 1,
      max_num = 999,
      prompt = "#huisheng-invoke:" .. data.from.id,
      cancelable = true,
    })
    if #cards > 0 then
      event:setCostData(self, {tos = {data.from}, cards = cards})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = event:getCostData(self).cards
    local n = #cards
    local get = room:askToChooseCard(data.from, {
      target = player,
      flag = { card_data = {{player.general, cards}} },
      skill_name = huisheng.name,
    })
    if #room:askToDiscard(data.from, {
      skill_name = huisheng.name,
      include_equip = true,
      min_num = n,
      max_num = n,
      prompt = "#huisheng-discard::"..player.id..":"..n..":"..Fk:getCardById(get, true):toLogString(),
      cancelable = true,
    }) ~= n then
      room:addTableMark(player, huisheng.name, data.from.id)
      data:preventDamage()
      room:obtainCard(data.from, get, false, fk.ReasonPrey, data.from, huisheng.name)
    end
  end,
})

return huisheng
