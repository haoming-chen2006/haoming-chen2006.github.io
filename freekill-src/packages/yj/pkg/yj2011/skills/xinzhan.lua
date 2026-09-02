local xinzhan = fk.CreateSkill {
  name = "xinzhan",
}

Fk:loadTranslationTable{
  ["xinzhan"] = "心战",
  [":xinzhan"] = "出牌阶段限一次，若你的手牌数大于体力上限，你可以观看牌堆顶三张牌，展示并获得其中任意数量<font color='red'>♥</font>牌，"..
  "将其余牌以任意顺序置于牌堆顶。",

  ["#xinzhan"] = "心战：观看牌堆顶的三张牌，获得其中任意张<font color='red'>♥</font>牌，其余牌以任意顺序置于牌堆顶",
  ["#xinzhan-choose"] = "心战：获得任意张<font color='red'>♥</font>牌，调整其余牌顺序",

  ["$xinzhan1"] = "吾通晓兵法，世人皆知。",
  ["$xinzhan2"] = "用兵之道，攻心为上。",
}

xinzhan:addEffect("active", {
  anim_type = "drawcard",
  prompt = "#xinzhan",
  card_num = 0,
  target_num = 0,
  card_filter = Util.FalseFunc,
  can_use = function(self, player)
    return player:usedSkillTimes(xinzhan.name, Player.HistoryPhase) == 0 and player:getHandcardNum() > player.maxHp
  end,
  on_use = function(self, room, effect)
    local player = effect.from
    local cards = room:getNCards(3)
    local cardmap = room:askToArrangeCards(player, {
      skill_name = xinzhan.name,
      card_map = {cards, "Top", "toObtain"},
      prompt = "#xinzhan-choose",
      free_arrange = true,
      box_size = 0,
      max_limit = {3, 3},
      min_limit = {0, 0},
      pattern = ".|.|heart",
    })
    if #cardmap[2] > 0 then
      room:moveCardTo(cardmap[2], Player.Hand, player, fk.ReasonJustMove, xinzhan.name)
    end
  end,
})

return xinzhan