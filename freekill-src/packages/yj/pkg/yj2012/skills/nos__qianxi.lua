local qianxi = fk.CreateSkill {
  name = "nos__qianxi",
}

Fk:loadTranslationTable{
  ["nos__qianxi"] = "潜袭",
  [":nos__qianxi"] = "当你使用【杀】对距离为1的目标角色造成伤害时，你可以进行一次判定，若判定结果不为<font color='red'>♥</font>，"..
  "你防止此伤害，改为令其减1点体力上限。",

  ["#nos__qianxi-invoke"] = "潜袭：是否防止对 %dest 造成的伤害，改为令其减1点体力上限？",

  ["$nos__qianxi1"] = "伤其十指，不如断其一指！",
  ["$nos__qianxi2"] = "斩草除根，除恶务尽！",
}

qianxi:addEffect(fk.DetermineDamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qianxi.name) and player:distanceTo(data.to) == 1 and
      data.card and data.card.trueName == "slash" and player.room.logic:damageByCardEffect()
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = qianxi.name,
      prompt = "#nos__qianxi-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local judge = {
      who = player,
      reason = qianxi.name,
      pattern = ".|.|spade,club,diamond",
    }
    room:judge(judge)
    if judge:matchPattern() and not data.to.dead then
      data:preventDamage()
      room:changeMaxHp(data.to, -1)
    end
  end,
})

return qianxi
