local qingxi = fk.CreateSkill {
  name = "qingxi",
}

Fk:loadTranslationTable{
  ["qingxi"] = "倾袭",
  [":qingxi"] = "当你使用【杀】造成伤害时，若你装备区内有武器牌，你可以令该角色选择一项：1.弃置X张手牌，然后弃置你的武器牌；"..
  "2.令此【杀】伤害+1（X为该武器的攻击范围）。",

  ["#qingxi-invoke"] = "倾袭：是否对 %dest 发动“倾袭”，令其弃牌或伤害+1？",
  ["#qingxi-discard"] = "倾袭：你需弃置%arg张手牌，否则伤害+1",

  ["$qingxi1"] = "策马疾如电，溃敌一瞬间。",
  ["$qingxi2"] = "虎豹骑岂能徒有虚名？杀！",
}

qingxi:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(qingxi.name) and
      data.card and data.card.trueName == "slash" and
      #player:getEquipments(Card.SubtypeWeapon) > 0
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = qingxi.name,
      prompt = "#qingxi-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local n = math.max(table.unpack(table.map(player:getEquipments(Card.SubtypeWeapon), function (id)
      return Fk:getCardById(id):getAttackRange(player)
    end)))
    if #room:askToDiscard(data.to, {
      min_num = n,
      max_num = n,
      include_equip = false,
      skill_name = qingxi.name,
      cancelable = true,
      prompt = "#qingxi-discard:::"..n,
    }) == n then
      room:throwCard(player:getEquipments(Card.SubtypeWeapon), qingxi.name, player, data.to)
    else
      data:changeDamage(1)
    end
  end,
})

return qingxi
