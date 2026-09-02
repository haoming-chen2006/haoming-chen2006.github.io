local kuangfu = fk.CreateSkill {
  name = "sp__kuangfu",
}

Fk:loadTranslationTable{
  ["sp__kuangfu"] = "狂斧",
  [":sp__kuangfu"] = "当你使用【杀】对目标角色造成伤害后，你可以选择一项：1.将其装备区里的一张牌置入你的装备区；2.弃置其装备区里的一张牌。",

  ["sp__kuangfu_discard"] = "弃置%dest一张装备",
  ["sp__kuangfu_move"] = "将%dest一张装备移至你的装备区",

  ["$sp__kuangfu1"] = "吾乃上将潘凤，可斩华雄！",
  ["$sp__kuangfu2"] = "这家伙，还是给我用吧！",
}

kuangfu:addEffect(fk.Damage, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(kuangfu.name) and
      data.card and data.card.trueName == "slash" and player.room.logic:damageByCardEffect() and
      not data.to.dead and #data.to:getCardIds("e") > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local choices = {"sp__kuangfu_discard::"..data.to.id, "Cancel"}
    if data.to:canMoveCardsInBoardTo(player, "e") then
      table.insert(choices, 2, "sp__kuangfu_move::"..data.to.id)
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = kuangfu.name,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {tos = {data.to}, choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    if choice:startsWith("sp__kuangfu_move") then
      room:askToMoveCardInBoard(player, {
        target_one = data.to,
        target_two = player,
        skill_name = kuangfu.name,
        flag = "e",
        move_from = data.to,
      })
    else
      local id = room:askToChooseCard(player, {
        target = data.to,
        flag = "e",
        skill_name = kuangfu.name,
      })
      room:throwCard(id, kuangfu.name, data.to, player)
    end
  end,
})

return kuangfu
