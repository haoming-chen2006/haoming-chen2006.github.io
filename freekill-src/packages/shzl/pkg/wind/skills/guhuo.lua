local guhuo = fk.CreateSkill({
  name = "guhuo",
})

Fk:loadTranslationTable{
  ["guhuo"] = "蛊惑",
  [":guhuo"] = "你可以扣置一张手牌当做一张基本牌或普通锦囊牌使用或打出，体力值大于0的其他角色选择是否质疑，然后你展示此牌："..
  "若无角色质疑，此牌按你所述继续结算；若有角色质疑：若此牌为真，质疑角色各失去1点体力，否则质疑角色各摸一张牌，"..
  "且若此牌为<font color='red'>♥</font>且为真，则按你所述继续结算，否则将之置入弃牌堆。",

  ["#guhuo-ask"] = "蛊惑：是否质疑 %dest 使用/打出的 %arg",
  ["question"] = "质疑",
  ["noquestion"] = "不质疑",
  ["#guhuo_use"] = "%from 发动了 “%arg2”，声明此牌为 %arg，指定的目标为 %to",
  ["#guhuo_no_target"] = "%from 发动了“%arg2”，声明此牌为 %arg",

  ["$guhuo1"] = "你信吗？",
  ["$guhuo2"] = "猜猜看呐~",
}

guhuo:addEffect("viewas", {
  pattern = ".",
  interaction = function(self, player)
    local all_names = Fk:getAllCardNames("bt")
    local names = player:getViewAsCardNames(guhuo.name, all_names)
    if #names == 0 then return end
    return UI.CardNameBox { choices = names, all_choices = all_names }
  end,
  filter_pattern = {
    min_num = 1,
    max_num = 1,
    pattern = ".|.|.|^equip",
  },
  view_as = function(self, player, cards)
    if #cards ~= 1 or not self.interaction.data then return end
    local card = Fk:cloneCard(self.interaction.data)
    card:addFakeSubcards(cards)
    card.skillName = guhuo.name
    return card
  end,
  before_use = function(self, player, use)
    local room = player.room
    local cards = use.card.fake_subcards
    local card_id = cards[1]
    room:moveCardTo(cards, Card.Void, nil, fk.ReasonPut, guhuo.name, nil, false)
    --暂时放到Card.Void,理论上应该是Card.Processing,只要moveVisible可以false
    local targets = use.tos
    if targets and #targets > 0 then
      room:sendLog{
        type = "#guhuo_use",
        from = player.id,
        to = table.map(targets, Util.IdMapper),
        arg = use.card.name,
        arg2 = guhuo.name
      }
      room:doIndicate(player.id, targets)
    else
      room:sendLog{
        type = "#guhuo_no_target",
        from = player.id,
        arg = use.card.name,
        arg2 = guhuo.name
      }
    end
    local questioned = {}
    for _, p in ipairs(room:getOtherPlayers(player)) do
      if p.hp > 0 then
        local choice = room:askToChoice(p, {
          skill_name = guhuo.name,
          choices = {"noquestion", "question"},
          prompt = "#guhuo-ask::"..player.id..":"..use.card.name,
        })
        if choice ~= "noquestion" then
          table.insertIfNeed(questioned, p)
        end
        room:sendLog{
          type = "#Choice",
          from = p.id,
          arg = choice,
        }
      end
    end
    local success = false
    local canuse = false
    local guhuo_card = Fk:getCardById(card_id)
    if #questioned > 0 then
      if use.card.name == guhuo_card.name then
        success = true
        if guhuo_card.suit == Card.Heart then
          canuse = true
        end
      end
    else
      canuse = true
    end
    player:showCards({card_id})
	--暂时使用setCardArea,当moveVisible可以false之后,不必再移动到Card.Void,也就不必再setCardArea
    table.removeOne(room.void, card_id)
    table.insert(room.processing_area, card_id)
    room:setCardArea(card_id, Card.Processing, nil)

    if success then
      for _, p in ipairs(questioned) do
        room:loseHp(p, 1, guhuo.name)
      end
    else
      for _, p in ipairs(questioned) do
        p:drawCards(1, guhuo.name)
      end
    end
    if canuse then
      use.card:addSubcard(card_id)
    else
      room:moveCardTo(card_id, Card.DiscardPile, nil, fk.ReasonPutIntoDiscardPile, guhuo.name)
      return ""
    end
  end,
  enabled_at_play = function(self, player)
    return not player:isKongcheng()
  end,
  enabled_at_response = function(self, player, response)
    return not player:isKongcheng()
  end,
})

guhuo:addAI(nil, "vs_skill")

guhuo:addAI({
  think_choice = function (self, ai, choices, skill_name, prompt, all_choices)
    local event = ai.room.logic:getCurrentEvent()
    local player = ai.player
    if event and event.event == GameEvent.SkillEffect then
      ---@cast event GameEvent.SkillEffect
      local from = event.data.who
      -- 是队友就不质疑
      if player:isFriend(from) then
        return "noquestion", 1
      else
        return "question", 1
      end
    end
    return table.random(choices), 1
  end,
})

return guhuo
