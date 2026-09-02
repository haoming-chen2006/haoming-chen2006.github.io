Fk:loadTranslationTable{
  ["jijie"] = "机捷",
  [":jijie"] = "出牌阶段限一次，你可以观看牌堆底的一张牌，将此牌交给一名角色。",

  ["#jijie"] = "机捷：你可以观看牌堆底的一张牌，将之交给一名角色",
  ["#jijie-give"] = "机捷：将 %arg 交给一名角色",

  ["$jijie1"] = "一拜一起，未足为劳。",
  ["$jijie2"] = "识言观行，方能雍容风议。",
}

local jijie = fk.CreateSkill{
  name = "jijie",
}

jijie:addEffect("active", {
  anim_type = "support",
  prompt = "#jijie",
  card_num = 0,
  target_num = 0,
  max_phase_use_time = 1,
  card_filter = Util.FalseFunc,
  on_use = function(self, room, effect)
    local player = effect.from
    local cids = room:getNCards(1, "bottom")
    room:askToYiji(player, {
      cards = cids,
      targets = room.alive_players,
      skill_name = jijie.name,
      max_num = 1,
      min_num = 1,
      prompt = "#jijie-give:::" .. Fk:getCardById(cids[1]):toLogString(),
      expand_pile = cids,
      cancelable = false,
    })
  end,
})

return jijie
