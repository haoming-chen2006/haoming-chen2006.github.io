local xianchou = fk.CreateSkill({
  name = "xianchou",
})

Fk:loadTranslationTable{
  ["xianchou"] = "陷仇",
  [":xianchou"] = "当你受到伤害后，可以选择一名除来源外的其他角色，该角色可以弃置一张牌，视为对来源使用普【杀】。"..
  "若此【杀】造成过伤害，则该角色摸一张牌，你回复1点体力。",

  ["#xianchou-choose"] = "陷仇：你可选择一名角色，令其可弃置一张手牌视为对%dest使用【杀】",
  ["#xianchou-discard"] = "陷仇：你可以弃置一张手牌，视为对%dest使用【杀】，若造成伤害则摸一张牌且%src回复1点体力",

  ["$xianchou1"] = "夫君勿忘，杀妻害子之仇！",
  ["$xianchou2"] = "吾母子之仇，便全靠夫君来报了！",
}

xianchou:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return
      target == player and
      player:hasSkill(xianchou.name) and
      data.from and
      not data.from.dead and
      not table.every(player.room.alive_players, function (p)
        return p == player or p == data.from
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    if not data.from or data.from.dead then return false end
    local targets = room:getAlivePlayers(false)
    table.removeOne(targets, player)
    table.removeOne(targets, data.from)
    local to = room:askToChoosePlayers(
      player,
      {
        targets = targets,
        min_num = 1,
        max_num = 1,
        prompt = "#xianchou-choose::" .. data.from.id,
        skill_name = xianchou.name,
        cancelable = true
      }
    )
    if #to > 0 then
      event:setCostData(self, to[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = xianchou.name
    local room = player.room
    local to = event:getCostData(self)
    local card = room:askToDiscard(
      to,
      {
        min_num = 1,
        max_num = 1,
        include_equip = true,
        skill_name = skillName,
        cancelable = true,
        pattern = ".",
        prompt = "#xianchou-discard:" .. player.id .. ":" .. data.from.id
      }
    )
    if #card > 0 then
      if to.dead or data.from.dead then return false end
      local slash = Fk:cloneCard("slash")
      slash.skillName = skillName
      if to:prohibitUse(slash) or to:isProhibited(data.from, slash) then return false end
      local use = { from = to, tos = { data.from }, card = slash, extraUse = true }
      room:useCard(use)
      if use.damageDealt then
        if not to.dead then
          room:drawCards(to, 1, skillName)
        end
        if not player.dead and player:isWounded() then
          room:recover({
            who = player,
            num = 1,
            recoverBy = to,
            skillName = skillName
          })
        end
      end
    end
  end,
})

return xianchou
