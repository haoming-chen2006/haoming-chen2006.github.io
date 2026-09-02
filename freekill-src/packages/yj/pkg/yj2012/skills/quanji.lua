local quanji = fk.CreateSkill {
  name = "quanji",
  derived_piles = "zhonghui_quan",
}

Fk:loadTranslationTable{
  ["quanji"] = "权计",
  [":quanji"] = "当你受到1点伤害后，你可以摸一张牌，然后将一张手牌置于武将牌上，称为“权”；每有一张“权”，你的手牌上限便+1。",

  ["zhonghui_quan"] = "权",
  ["#quanji-ask"] = "权计：将一张手牌置为“权”",

  ["$quanji1"] = "这仇，我记下了。",
  ["$quanji2"] = "先让你得意几天。",
}

quanji:addEffect(fk.Damaged, {
  anim_type = "masochism",
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:drawCards(1, quanji.name)
    if player:isKongcheng() or player.dead then return end
    local card = room:askToCards(player, {
      skill_name = quanji.name,
      include_equip = false,
      min_num = 1,
      max_num = 1,
      prompt = "#quanji-ask",
      cancelable = false,
    })
    player:addToPile("zhonghui_quan", card, true, quanji.name)
  end,
})

quanji:addEffect("maxcards", {
  correct_func = function(self, player)
    if player:hasSkill(quanji.name) then
      return #player:getPile("zhonghui_quan")
    end
  end,
})

local AI = Fk.Ltk.AI
quanji:addAI(AI.reuse("biyue", AI.InvokeStrategy))

return quanji
