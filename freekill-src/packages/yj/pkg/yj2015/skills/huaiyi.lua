
local huaiyi = fk.CreateSkill {
  name = "huaiyi",
}

Fk:loadTranslationTable{
  ["huaiyi"] = "怀异",
  [":huaiyi"] = "出牌阶段限一次，你可以展示所有手牌，若其中包含两种颜色，则你弃置其中一种颜色的牌，然后获得至多X名其他角色的各一张牌"..
  "（X为你以此法弃置的手牌数）。若你获得的牌大于一张，则你失去1点体力。",

  ["#huaiyi"] = "怀异：展示手牌，弃置其中一种颜色的牌，获得等量名其他角色各一张牌",
  ["#huaiyi-choose"] = "怀异：你可以获得至多%arg名角色各一张牌",

  ["$huaiyi1"] = "此等小利，焉能安吾雄心？",
  ["$huaiyi2"] = "一生纵横，怎可对他人称臣！",
}

huaiyi:addEffect("active", {
  anim_type = "control",
  prompt = "#huaiyi",
  card_num = 0,
  target_num = 0,
  can_use = function(self, player)
    return player:usedSkillTimes(huaiyi.name, Player.HistoryPhase) == 0 and not player:isKongcheng()
  end,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local cards = table.simpleClone(player:getCardIds("h"))
    player:showCards(cards)
    if not table.find(cards, function (id)
      return table.find(cards, function (id2)
        return Fk:getCardById(id).color ~= Fk:getCardById(id2).color
      end) ~= nil
    end) or player.dead or player:isKongcheng() then return end
    local red = table.filter(cards, function (id)
      return table.contains(player:getCardIds("h"), id) and Fk:getCardById(id).color == Card.Red and not player:prohibitDiscard(id)
    end)
    local black = table.filter(cards, function (id)
      return table.contains(player:getCardIds("h"), id) and Fk:getCardById(id).color == Card.Black and not player:prohibitDiscard(id)
    end)
    local colors = {}
    if #red > 0 then
      table.insert(colors, "red")
    end
    if #black > 0 then
      table.insert(colors, "black")
    end
    if #colors == 0 then return end
    local color = room:askToChoice(player, {
      choices = colors,
      skill_name = huaiyi.name,
      all_choices = {"red", "black"},
    })
    cards = color == "red" and red or black
    room:throwCard(cards, huaiyi.name, player, player)
    if player.dead then return end
    local targets = table.filter(room:getOtherPlayers(player, false), function (p)
      return not p:isNude()
    end)
    if #targets == 0 then return end
    targets = room:askToChoosePlayers(player, {
      targets = targets,
      min_num = 1,
      max_num = #cards,
      skill_name = huaiyi.name,
      prompt = "#huaiyi-choose:::"..#cards,
    })
    if #targets > 0 then
      room:sortByAction(targets)
      local n = 0
      for _, to in ipairs(targets) do
        if not to:isNude() and not to.dead then
          local id = room:askToChooseCard(player, {
            target = to,
            flag = "he",
            skill_name = huaiyi.name,
          })
          n = n + 1
          room:moveCardTo(id, Card.PlayerHand, player, fk.ReasonPrey, huaiyi.name, nil, false, player)
        end
      end
      if n > 1 and not player.dead then
        room:loseHp(player, 1, huaiyi.name)
      end
    end
  end,
})

return huaiyi
