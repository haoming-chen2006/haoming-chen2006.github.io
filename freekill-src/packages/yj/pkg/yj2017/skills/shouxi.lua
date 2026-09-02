local shouxi = fk.CreateSkill {
  name = "shouxi",
}

Fk:loadTranslationTable{
  ["shouxi"] = "守玺",
  [":shouxi"] = "当你成为【杀】的目标后，你可以声明一种未以此法声明过的基本牌或锦囊牌的牌名，然后使用者选择一项："..
  "1.弃置一张你声明的牌，然后获得你的一张牌；2.此【杀】对你无效。",

  ["@$shouxi"] = "守玺",
  ["#shouxi-invoke"] = "守玺：声明一种牌名，令 %dest 选择弃一张对应的牌或此【杀】对你无效",
  ["#shouxi-discard"] = "守玺：弃置一张%arg并获得 %dest 一张牌，否则此【杀】对其无效",

  ["$shouxi1"] = "天子之位，乃归刘汉！",
  ["$shouxi2"] = "吾父功盖寰区，然且不敢篡窃神器。",
}

local U = require "packages.utility.utility"

shouxi:addEffect(fk.TargetConfirmed, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shouxi.name) and
      data.card.trueName == "slash" and not data.from.dead and
      #player:getTableMark("@$shouxi") < #Fk:getAllCardNames("btd", true)
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    local all_choices = Fk:getAllCardNames("btd", true)
    local choices = table.filter(all_choices, function (name)
      return not table.contains(player:getTableMark("@$shouxi"), name)
    end)
    local choice = U.askForChooseCardNames(room, player, choices, 1, 1, shouxi.name, "#shouxi-invoke::"..data.from.id, all_choices, true)
    if #choice == 1 then
      event:setCostData(self, {tos = {data.from}, choice = choice[1]})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:sendLog{
      type = "#Choice",
      from = player.id,
      arg = choice,
      toast = true,
    }
    room:addTableMark(player, "@$shouxi", choice)
    if #room:askToDiscard(data.from, {
      min_num = 1,
      max_num = 1,
      pattern = choice,
      skill_name = shouxi.name,
      prompt = "#shouxi-discard::"..player.id..":"..choice,
    }) == 0 then
      data.use.nullifiedTargets = data.use.nullifiedTargets or {}
      table.insertIfNeed(data.use.nullifiedTargets, player)
    elseif not player:isNude() and not data.from.dead and not player.dead then
      local card = room:askToChooseCard(data.from, {
        target = player,
        flag = "he",
        skill_name = shouxi.name,
      })
      room:obtainCard(data.from, card, false, fk.ReasonPrey, data.from, shouxi.name)
    end
  end,
})

return shouxi
