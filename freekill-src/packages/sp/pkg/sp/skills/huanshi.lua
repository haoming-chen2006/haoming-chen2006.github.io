local huanshi = fk.CreateSkill {
  name = "huanshi",
}

Fk:loadTranslationTable{
  ["huanshi"] = "缓释",
  [":huanshi"] = "当一名角色的判定牌生效前，你可以令该角色观看你的手牌并选择你的一张牌，你打出此牌代替之。",

  ["#huanshi-invoke"] = "缓释：你可以令 %dest 观看你的手牌，打出你的一张牌修改其“%arg”判定",

  ["$huanshi1"] = "缓乐之危急，释兵之困顿。",
  ["$huanshi2"] = "尽死生之力，保友邦之安。",
}

huanshi:addEffect(fk.AskForRetrial, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(huanshi.name) and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = huanshi.name,
      prompt = "#huanshi-invoke::"..target.id..":"..data.reason
    }) then
      event:setCostData(self, {tos = {target}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card_data = {}
    if not player:isKongcheng() then
      table.insert(card_data, { "$Hand", player:getCardIds("h") })
    end
    if #player:getCardIds("e") > 0 then
      table.insert(card_data, { "$Equip", player:getCardIds("e") })
    end
    local id = room:askToChooseCard(target, {
      target = player,
      flag = { card_data = card_data },
      skill_name = huanshi.name,
    })
    local card = Fk:getCardById(id)
    if not player:prohibitResponse(card) then
      room:changeJudge{
        card = card,
        player = player,
        data = data,
        skillName = huanshi.name,
        response = true,
      }
    end
  end,
})

return huanshi
