local mouQianxun = fk.CreateSkill({
  name = "mou__qianxun",
  derived_piles = "$mou__qianxun_xun",
})

Fk:loadTranslationTable{
  ["mou__qianxun"] = "谦逊",
  [":mou__qianxun"] = "当锦囊牌对你生效时，若此牌名未被“谦逊”记录过且你不为使用者，则你记录之，" ..
  "然后你可以将至多X张牌扣置于你的武将牌上（X为“谦逊”记录的牌名数，且至多为5）。回合结束时，你获得这些扣置的牌；" ..
  "出牌阶段开始时，你可移去“谦逊”记录的一个牌名，若此牌名为普通锦囊牌，则你可视为使用此牌。",
  ["#mou__qianxun_back"] = "谦逊",
  ["#mou__qianxun-put"] = "谦逊：你可将至多%arg张牌扣置于武将牌上，于此回合结束时收回",
  ["#mou__qianxun_remove"] = "谦逊：你可移去其中一个牌名记录，若为普通锦囊牌则可视为使用之",
  ["@$mou__qianxun_names"] = "谦逊牌名",
  ["$mou__qianxun_xun"] = "谦逊",

  ["$mou__qianxun1"] = "虽有戈矛之刺，不如恭俭之利也。",
  ["$mou__qianxun2"] = "贤者任重而行恭，智者功大而辞顺。",
}

local U = require "packages.utility.utility"

mouQianxun:addEffect(fk.CardEffecting, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if not (target == player and player:hasSkill(mouQianxun.name)) then
      return false
    end

    return
      data.from ~= player and
      data.card.type == Card.TypeTrick and
      not table.contains(player:getTableMark("@$mou__qianxun_names"), data.card.trueName)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouQianxun.name
    local room = player.room
    room:addTableMarkIfNeed(player, "@$mou__qianxun_names", data.card.trueName)
    if player:isNude() then
      return false
    end

    local max = math.min(#player:getTableMark("@$mou__qianxun_names"), 5)
    local ids = room:askToCards(
      player,
      {
        min_num = 1,
        max_num = max,
        include_equip = true,
        skill_name = skillName,
        prompt = "#mou__qianxun-put:::" .. max
      }
    )
    if #ids > 0 then
      player:addToPile("$mou__qianxun_xun", ids, false, skillName, player)
    end
  end,
})

mouQianxun:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    if not (target == player and player:hasSkill(mouQianxun.name)) then
      return false
    end

    return player.phase == Player.Play and #player:getTableMark("@$mou__qianxun_names") > 0
  end,
  on_cost = function(self, event, target, player, data)
    local results = player.room:askToChoices(
      player,
      {
        choices = player:getTableMark("@$mou__qianxun_names"),
        min_num = 1,
        max_num = 1,
        skill_name = mouQianxun.name,
        prompt = "#mou__qianxun_remove",
      }
    )
    if #results > 0 then
      event:setCostData(self, results[1])
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local nameChosen = event:getCostData(self)
    local names = player:getTableMark("@$mou__qianxun_names")
    table.removeOne(names, nameChosen)
    room:setPlayerMark(player, "@$mou__qianxun_names", #names > 0 and names or 0)
    if Fk:cloneCard(nameChosen):isCommonTrick() then
      room:askToUseVirtualCard(player, { name = nameChosen, skill_name = mouQianxun.name })
    end
  end,
})

mouQianxun:addEffect(fk.TurnEnd, {
  is_delay_effect = true,
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouQianxun.name) and #player:getPile("$mou__qianxun_xun") > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, player:getPile("$mou__qianxun_xun"), false, fk.ReasonPrey, player, mouQianxun.name)
  end,
})

return mouQianxun
